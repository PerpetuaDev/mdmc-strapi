const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

// Server-side check of a Cloudflare Turnstile token (single-use). Fails open
// when the secret is missing or Cloudflare itself is unreachable — a broken
// anti-spam layer must never take the contact/application forms down — and
// fails closed only when Cloudflare explicitly rejects the token.
export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    strapi.log.error('TURNSTILE_SECRET_KEY is not set — skipping anti-spam verification')
    return true
  }
  if (!token) return false
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    })
    const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] }
    if (!data.success) {
      strapi.log.warn(`turnstile: token rejected (${(data['error-codes'] ?? []).join(', ')})`)
    }
    return data.success
  } catch (e) {
    strapi.log.error(`turnstile: siteverify unreachable, allowing request — ${e}`)
    return true
  }
}
