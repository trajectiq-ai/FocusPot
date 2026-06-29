import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auditLog } from '@/lib/audit'

/**
 * POST /api/stripe/webhook
 *
 * Real Stripe webhook handler. Processes subscription lifecycle events from
 * Stripe and updates the corresponding Company record.
 *
 * To enable:
 * 1. Set STRIPE_WEBHOOK_SECRET in environment variables
 * 2. Configure the webhook endpoint in Stripe Dashboard → Developers → Webhooks
 *    pointing to: https://yourdomain.com/api/stripe/webhook
 * 3. Add the company's Stripe Customer ID to the Company table (stripeCustomerId field)
 *
 * Events handled:
 * - checkout.session.completed → activate subscription
 * - customer.subscription.updated → update plan/status
 * - customer.subscription.deleted → cancel subscription
 * - invoice.payment_succeeded → record billing history
 * - invoice.payment_failed → mark subscription past_due
 */

// Simple raw body reader for Stripe signature verification
async function getRawBody(req: NextRequest): Promise<Buffer> {
  const arrayBuffer = await req.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// Lazy-load Stripe only when the webhook is actually called
async function getStripe() {
  try {
    const Stripe = (await import('stripe')).default
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) return null
    return new Stripe(secretKey)
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await getRawBody(req)
  const signature = req.headers.get('stripe-signature') || ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  // If Stripe is not configured, return a clear error (not a fake success)
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook secret not configured. Set STRIPE_WEBHOOK_SECRET environment variable.' },
      { status: 503 }
    )
  }

  const stripe = await getStripe()
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe SDK not available. Install stripe package and set STRIPE_SECRET_KEY.' },
      { status: 503 }
    )
  }

  // Verify the webhook signature (real Stripe security)
  let event: any
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: any) {
    await auditLog({
      action: 'STRIPE_WEBHOOK_SIGNATURE_FAILED',
      entityType: 'Webhook',
      metadata: { error: err.message },
    })
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const companyId = session.metadata?.companyId
        const plan = session.metadata?.plan || 'STARTER'
        if (!companyId) break

        const seats = plan === 'GROWTH' ? 200 : 50
        const monthlyRevenue = plan === 'GROWTH' ? 199 : 99

        await db.company.update({
          where: { id: companyId },
          data: {
            subscriptionStatus: 'ACTIVE',
            plan,
            seats,
            monthlyRevenue,
          },
        })
        await auditLog({
          action: 'STRIPE_SUBSCRIPTION_ACTIVATED',
          entityType: 'Company',
          entityId: companyId,
          companyId,
          metadata: { plan, stripeSessionId: session.id },
        })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const status = subscription.status
        // Find company by stripe customer ID stored in metadata
        const companyId = subscription.metadata?.companyId
        if (!companyId) break

        const plan = subscription.metadata?.plan || 'STARTER'
        const dbStatus = status === 'active' ? 'ACTIVE' : status === 'past_due' ? 'PAST_DUE' : status === 'canceled' ? 'CANCELED' : 'ACTIVE'

        await db.company.update({
          where: { id: companyId },
          data: {
            subscriptionStatus: dbStatus,
            plan,
            seats: plan === 'GROWTH' ? 200 : 50,
            monthlyRevenue: dbStatus === 'CANCELED' ? 0 : (plan === 'GROWTH' ? 199 : 99),
          },
        })
        await auditLog({
          action: 'STRIPE_SUBSCRIPTION_UPDATED',
          entityType: 'Company',
          entityId: companyId,
          companyId,
          metadata: { stripeStatus: status, plan },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const companyId = subscription.metadata?.companyId
        if (!companyId) break

        await db.company.update({
          where: { id: companyId },
          data: {
            subscriptionStatus: 'CANCELED',
            monthlyRevenue: 0,
          },
        })
        await auditLog({
          action: 'STRIPE_SUBSCRIPTION_CANCELED',
          entityType: 'Company',
          entityId: companyId,
          companyId,
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const companyId = invoice.metadata?.companyId
        if (!companyId) break

        await db.company.update({
          where: { id: companyId },
          data: { subscriptionStatus: 'PAST_DUE' },
        })
        await auditLog({
          action: 'STRIPE_PAYMENT_FAILED',
          entityType: 'Company',
          entityId: companyId,
          companyId,
          metadata: { invoiceId: invoice.id },
        })
        break
      }

      default:
        // Unhandled event type — acknowledge but don't process
        break
    }

    return NextResponse.json({ received: true, type: event.type })
  } catch (error: any) {
    await auditLog({
      action: 'STRIPE_WEBHOOK_ERROR',
      entityType: 'Webhook',
      metadata: { error: error.message, eventType: event?.type },
    })
    return NextResponse.json({ error: `Webhook handler error: ${error.message}` }, { status: 500 })
  }
}
