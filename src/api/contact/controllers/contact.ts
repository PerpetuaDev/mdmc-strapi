import type { Context } from 'koa'
import Mailgun from 'mailgun.js'
import FormData from 'form-data'
import { verifyTurnstile } from '../../../utils/turnstile'

const DOMAIN = 'mg.mdmc.co'

// Studio routing. The contact form posts a `recipient` string chosen by the
// visitor (ContactView.astro sets it from a studio fold's CTA, default 'MDMC').
// It is used ONLY as a lookup key into this map and is never interpolated into
// an address — otherwise a crafted `recipient` would let anyone pick where our
// mail is sent. Anything unrecognised falls back to the general inbox.
const STUDIO_INBOX: Record<string, string> = {
  'New Zealand Studio': 'nz@mdmc.co',
  'Australia Studio': 'au@mdmc.co',
  'Japan Studio': 'contact@mdmc.co.jp',
}
const DEFAULT_INBOX = 'contact@mdmc.co'

export default {
  async send(ctx: Context) {
    const { name, email, company, budget, message, turnstileToken, recipient } = ctx.request.body as Record<string, string>

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

    const apiKey = process.env.MAILGUN_API_KEY
    if (!apiKey) {
      strapi.log.error('MAILGUN_API_KEY is not set')
      ctx.status = 500
      ctx.body = { error: 'Email service is not configured' }
      return
    }

    const mg = new Mailgun(FormData).client({ username: 'api', key: apiKey })

    const to = STUDIO_INBOX[recipient] ?? DEFAULT_INBOX

    const lines = [
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Company: ${company}` : null,
      budget ? `Budget: ${budget}` : null,
      // Recorded even when it routes to the default inbox, so the studio the
      // visitor actually picked is never lost.
      `Studio: ${recipient || 'MDMC'}`,
      '',
      message,
    ].filter((l) => l !== null).join('\n')

    await mg.messages.create(DOMAIN, {
      from: `MDMC Contact Form <noreply@${DOMAIN}>`,
      to: [to],
      'h:Reply-To': `${name} <${email}>`,
      subject: `New enquiry from ${name}${company ? ` — ${company}` : ''}`,
      text: lines,
    })

    ctx.status = 200
    ctx.body = { ok: true }
  },
}
