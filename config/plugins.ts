import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  upload: {
    config: {
      provider: '@strapi-community/strapi-provider-upload-google-cloud-storage',
      providerOptions: {
        bucketName: env('GCS_BUCKET_NAME', 'mdmc-strapi-media'),
        baseUrl: env('GCS_BASE_URL', 'https://storage.googleapis.com/mdmc-strapi-media'),
        basePath: env('GCS_BASE_PATH', 'uploads'),
        publicFiles: true,
        uniform: false,
        serviceAccount: env.json('GCS_SERVICE_ACCOUNT_JSON'),
      },
    },
  },
});

export default config;
