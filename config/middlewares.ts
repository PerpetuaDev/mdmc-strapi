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
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://perpetuadev.github.io',
        'https://mdmc.co',
        'https://www.mdmc.co',
        'https://mdmc.co.jp',
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
