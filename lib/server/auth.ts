// Admin session: a signed cookie holding an expiry time. Uses Web Crypto so it
// works in both middleware (edge) and server code.

export const SESSION_COOKIE = 'tb_admin'
const SESSION_DAYS = 7

const enc = new TextEncoder()

async function hmac(data: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret || secret.length < 32) throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters')
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('')
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function createSession(): Promise<{ value: string; maxAge: number }> {
  const maxAge = SESSION_DAYS * 24 * 60 * 60
  const exp = String(Date.now() + maxAge * 1000)
  return { value: `${exp}.${await hmac(exp)}`, maxAge }
}

export async function verifySession(value: string | undefined): Promise<boolean> {
  if (!value) return false
  const [exp, sig] = value.split('.')
  if (!exp || !sig || Number(exp) < Date.now()) return false
  try {
    return safeEqual(sig, await hmac(exp))
  } catch {
    return false
  }
}

// Compares submitted credentials against ADMIN_EMAIL and ADMIN_PASSWORD.
export async function checkCredentials(email: string, password: string): Promise<boolean> {
  const wantEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const wantPassword = process.env.ADMIN_PASSWORD
  if (!wantEmail || !wantPassword || wantPassword.length < 12) return false
  // Hash both sides so the comparison is constant-time regardless of length.
  const [a, b] = await Promise.all([hmac(`pw:${password}`), hmac(`pw:${wantPassword}`)])
  return email.trim().toLowerCase() === wantEmail && safeEqual(a, b)
}
