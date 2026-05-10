import { factories } from '@strapi/strapi'
import Mailgun from 'mailgun.js'
import FormData from 'form-data'

const DOMAIN = 'mdmc.co'
const TO = 'contact@mdmc.co'

export default factories.createCoreController('api::contact.contact', () => ({
  async send(ctx) {
    const { name, email, company, budget, message } = ctx.request.body as Record<string, string>

    if (!name || !email || !message) {
      return ctx.badRequest('name, email, and message are required')
    }

    const apiKey = process.env.MAILGUN_API_KEY
    if (!apiKey) {
      strapi.log.error('MAILGUN_API_KEY is not set')
      return ctx.internalServerError('Email service is not configured')
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
}))
