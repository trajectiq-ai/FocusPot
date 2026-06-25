import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

/**
 * Password hashing using Node's built-in scrypt (no external deps).
 * Format: "scrypt:<salt_hex>:<hash_hex>"
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  // Support legacy plain-text passwords for backwards compat during migration
  if (!stored.startsWith('scrypt:')) {
    return password === stored
  }
  const [, salt, hash] = stored.split(':')
  const hashBuf = Buffer.from(hash, 'hex')
  const testBuf = scryptSync(password, salt, 64)
  if (hashBuf.length !== testBuf.length) return false
  return timingSafeEqual(hashBuf, testBuf)
}

/** Generate a human-friendly join code like "NORTH-WIND-7K2M" */
export function generateJoinCode(name: string): string {
  const prefix = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'FOCUS'
  const suffix = randomBytes(3).toString('hex').toUpperCase().slice(0, 4)
  return `${prefix}-${suffix}`
}

/** Generate a random alphanumeric password for invited employees */
export function generateTempPassword(): string {
  return randomBytes(6).toString('base64url').slice(0, 10)
}
