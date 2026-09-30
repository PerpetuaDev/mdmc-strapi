import type { Core } from '@strapi/strapi';

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      // Every origin the CONTACT and APPLY forms are submitted from. Both
      // endpoints are called from the browser, so an origin missing here means
      // the preflight comes back without access-control-allow-origin, the
      // browser blocks the POST, and the form shows a generic error and resets
      // its Turnstile widget — with nothing logged server-side, because the
      // request never arrives. mdmc.co.jp was missed when that domain launched.
      // There is no www.mdmc.co.jp host; add it here if one is ever created.
      //
      // The apply form fails WORSE than the contact form: it posts multipart
      // FormData, which is CORS-safelisted and so is NOT preflighted. The POST
      // therefore arrives and Strapi mails the application, but the browser
      // still blocks the response, the applicant is shown an error, and they
      // re-apply. Duplicate applications, delivered silently. Add a domain
      // here BEFORE it launches, never after.
      //
      // www.mdmc.co.nz 301s to the apex at the Cloudflare edge, so no page --
      // and no form -- is ever served from it; the apex entry is enough.
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://perpetuadev.github.io',
        'https://mdmc.co',
        'https://www.mdmc.co',
        'https://mdmc.co.jp',
        'https://mdmc.co.nz',
      ],
      headers: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'OPTIONS'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
