import type { Context } from 'koa'
import Mailgun from 'mailgun.js'
import FormData from 'form-data'
import { verifyTurnstile } from '../../../utils/turnstile'

// Which Mailgun account sends, keyed by the site the visitor was on. These are
// SEPARATE Mailgun accounts (each plan allows one custom domain), so the key and
// the domain must travel together — the mdmc key cannot send via mg.mdmc.co.jp
// or vice versa; it 404s.
const SENDERS = {
  co: { domain: 'mg.mdmc.co', keyVar: 'MAILGUN_API_KEY' },
  cojp: { domain: 'mg.mdmc.co.jp', keyVar: 'MAILGUN_API_KEY_JP' },
} as const

// Default inbox by region. Region comes from the site/stored preference rather
// than from anything the visitor types: co.jp is always jp (the domain IS the
// region), mdmc.co is the header's stored nz/au preference.
const REGION_INBOX: Record<string, string> = {
  nz: 'nz@mdmc.co',
  au: 'au@mdmc.co',
  jp: 'contact@mdmc.co.jp',
}

// An explicit studio choice overrides the region default. `recipient` is set by
// a studio fold's CTA and is 'MDMC' when the visitor never picked one.
//
// Both maps are keyed lookups ONLY — neither `recipient` nor `region` is ever
// interpolated into an address, since both arrive from the browser and a
// crafted value would otherwise redirect our mail.
const STUDIO_INBOX: Record<string, string> = {
  'New Zealand Studio': 'nz@mdmc.co',
  'Australia Studio': 'au@mdmc.co',
  'Japan Studio': 'contact@mdmc.co.jp',
}
const DEFAULT_INBOX = 'contact@mdmc.co'

export default {
  async send(ctx: Context) {
    const { name, email, company, budget, message, turnstileToken, recipient, site, region } = ctx.request.body as Record<string, string>

    if (!name || !email || !message) {
      ctx.status = 400
      ctx.body = { error: 'name, email, and message are required' }
      return
    }

    if (!(await verifyTurnstile(turnstileToken))) {
      ctx.status = 403
      ctx.body = { error: 'Anti-spam verification failed' }
      return
    }

    if (!process.env[SENDERS.co.keyVar]) {
      strapi.log.error(`${SENDERS.co.keyVar} is not set`)
      ctx.status = 500
      ctx.body = { error: 'Email service is not configured' }
      return
    }

    // Explicit studio choice wins; otherwise the region default; otherwise the
    // general inbox.
    const to = STUDIO_INBOX[recipient] ?? REGION_INBOX[region] ?? DEFAULT_INBOX

    const lines = [
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Company: ${company}` : null,
      budget ? `Budget: ${budget}` : null,
      // Recorded even when it routes to the default inbox, so the studio the
      // visitor actually picked is never lost.
      `Studio: ${recipient || 'MDMC'}`,
      `Region: ${region || 'unknown'}`,
      '',
      message,
    ].filter((l) => l !== null).join('\n')

    const deliver = async (s: (typeof SENDERS)[keyof typeof SENDERS]) => {
      const key = process.env[s.keyVar]
      if (!key) throw new Error(`${s.keyVar} is not set`)
      const mg = new Mailgun(FormData).client({ username: 'api', key })
      await mg.messages.create(s.domain, {
        from: `MDMC Contact Form <noreply@${s.domain}>`,
        to: [to],
        'h:Reply-To': `${name} <${email}>`,
        subject: `New enquiry from ${name}${company ? ` — ${company}` : ''}`,
        text: lines,
      })
    }

    // Send from the site's own account, but never lose an enquiry because that
    // account is unavailable: a missing key, an unverified domain (Mailgun 403s
    // those), or an outage all fall back to the default account. The From
    // address is less on-brand; the mail still arrives, at the same recipient.
    const preferred = SENDERS[site === 'cojp' ? 'cojp' : 'co']
    try {
      await deliver(preferred)
    } catch (err) {
      if (preferred === SENDERS.co) throw err
      strapi.log.error(
        `Mailgun send via ${preferred.domain} failed (${(err as Error).message}) — retrying via ${SENDERS.co.domain}`,
      )
      await deliver(SENDERS.co)
    }

    ctx.status = 200
    ctx.body = { ok: true }
  },
}
