import { createHmac, timingSafeEqual } from 'crypto'

export const ADMIN_COOKIE_NAME = 'admin-session'
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000 // 8 Stunden

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) throw new Error('ADMIN_SECRET_KEY nicht konfiguriert')
  return secret
}

export function createAdminSessionToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })
  ).toString('base64url')

  const sig = createHmac('sha256', getSecret()).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function verifyAdminSessionToken(token: string): boolean {
  try {
    const lastDot = token.lastIndexOf('.')
    if (lastDot === -1) return false

    const payload = token.slice(0, lastDot)
    const sig = token.slice(lastDot + 1)

    const expected = createHmac('sha256', getSecret()).update(payload).digest('hex')

    const sigBuf = Buffer.from(sig, 'hex')
    const expectedBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expectedBuf.length) return false
    if (!timingSafeEqual(sigBuf, expectedBuf)) return false

    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return Date.now() < exp
  } catch {
    return false
  }
}
