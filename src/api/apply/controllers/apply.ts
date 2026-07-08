import type { Context } from 'koa'
import { readFileSync } from 'node:fs'
import Mailgun from 'mailgun.js'
import FormData from 'form-data'

const DOMAIN = 'mdmc.co'
const FALLBACK_TO = 'recruit@mdmc.co'
const ALLOWED_EXT = ['.pdf', '.doc', '.docx']
const MAX_TOTAL_BYTES = 15 * 1024 * 1024 // 15MB across all attachments
const MAX_FILES = 4

// Job applications: multipart form (fields + CV/cover-letter files) forwarded
// to the hiring inbox via Mailgun with the documents attached. The recipient
// is resolved server-side from the job entry — never taken from the client.
export default {
  async send(ctx: Context) {
    const body = ctx.request.body as Record<string, string>
    const { name, email, portfolio, message, jobId } = body

    if (!name || !email) {
      ctx.status = 400
      ctx.body = { error: 'name and email are required' }
      return
    }

    const apiKey = process.env.MAILGUN_API_KEY
    if (!apiKey) {
      strapi.log.error('MAILGUN_API_KEY is not set')
      ctx.status = 500
      ctx.body = { error: 'Email service is not configured' }
      return
    }

    // Resolve the role + recipient from the job entry (any locale's entry
    // shares apply_email since it's non-localized).
    let jobTitle = 'General application'
    let to = FALLBACK_TO
    if (jobId) {
      try {
        const job = await strapi.documents('api::job.job').findOne({ documentId: jobId })
        if (job) {
          jobTitle = job.title ?? jobTitle
          to = job.apply_email ?? to
        }
      } catch (e) {
        strapi.log.warn(`apply: could not resolve job ${jobId}`)
      }
    }

    // Collect uploaded files (single or multiple under any field name).
    const rawFiles = ctx.request.files
      ? Object.values(ctx.request.files).flat()
      : []
    if (rawFiles.length > MAX_FILES) {
      ctx.status = 400
      ctx.body = { error: `At most ${MAX_FILES} files` }
      return
    }
    let total = 0
    const attachment = [] as { filename: string; data: Buffer }[]
    for (const f of rawFiles as any[]) {
      const filename = String(f.originalFilename ?? 'document')
      const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
      if (!ALLOWED_EXT.includes(ext)) {
        ctx.status = 400
        ctx.body = { error: 'Only .pdf, .doc, and .docx files are accepted' }
        return
      }
      total += f.size ?? 0
      if (total > MAX_TOTAL_BYTES) {
        ctx.status = 400
        ctx.body = { error: 'Attachments exceed the 15MB limit' }
        return
      }
      attachment.push({ filename, data: readFileSync(f.filepath) })
    }

    const mg = new Mailgun(FormData).client({ username: 'api', key: apiKey })

    const lines = [
      `Role: ${jobTitle}`,
      `Name: ${name}`,
      `Email: ${email}`,
      portfolio ? `Portfolio: ${portfolio}` : null,
      '',
      message || '(no message)',
      '',
      attachment.length
        ? `Attached: ${attachment.map((a) => a.filename).join(', ')}`
        : 'No documents attached.',
    ].filter((l) => l !== null).join('\n')

    await mg.messages.create(DOMAIN, {
      from: `MDMC Careers <noreply@${DOMAIN}>`,
      to: [to],
      'h:Reply-To': `${name} <${email}>`,
      subject: `Application — ${jobTitle} — ${name}`,
      text: lines,
      attachment,
    })

    ctx.status = 200
    ctx.body = { ok: true }
  },
}
