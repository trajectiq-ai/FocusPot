import { NextResponse } from 'next/server'

// GET /status
// Platform health-check endpoint (Z.ai platform probes /status).
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'focuspot', timestamp: new Date().toISOString() })
}
