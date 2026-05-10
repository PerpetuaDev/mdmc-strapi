import type { Context } from 'koa'
import Mailgun from 'mailgun.js'
import FormData from 'form-data'

const DOMAIN = 'mdmc.co'
const TO = 'contact@mdmc.co'

export default {
  async send(ctx: Context) {
    const { name, email, company, budget, message } = ctx.request.body as Record<string, string>

    if (!name || !email || !message) {
      ctx.status = 400
      ctx.body = { error: 'name, email, and message are required' }
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

    const lines = [
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Company: ${company}` : null,
      budget ? `Budget: ${budget}` : null,
      '',
      message,
    ].filter((l) => l !== null).join('\n')

    await mg.messages.create(DOMAIN, {
      from: `MDMC Contact Form <noreply@${DOMAIN}>`,
      to: [TO],
      'h:Reply-To': `${name} <${email}>`,
      subject: `New enquiry from ${name}${company ? ` — ${company}` : ''}`,
      text: lines,
    })

    ctx.status = 200
    ctx.body = { ok: true }
  },
}
