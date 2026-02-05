import tailwindcss from '@tailwindcss/vite'
import { name as pkgName } from './package.json'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      htmlAttrs: {
        style: 'background-color: var(--color-background);',
      },
      titleTemplate: '%siteName',
    },
  },

  colorMode: {
    storage: 'cookie',
  },

  compatibilityDate: '2025-07-15',

  css: ['~/assets/css/globals.css'],

  devtools: { enabled: true },

  eslint: {
    config: {
      import: false,
      standalone: false,
    },
  },

  experimental: {
    typescriptPlugin: true,
  },

  fonts: {
    defaults: {
      preload: true,
      weights: [400, 500, 700],
    },
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    'nuxt-security',
    '@vueuse/nuxt',
    'reka-ui/nuxt',
    '@nuxtjs/seo',
    '@nuxtjs/color-mode',
    'nuxt-vitalizer',
  ],

  nitro: {
    preset: 'node-server',
    imports: {
      dirs: [
        './server/schema/*',
        './server/utils/*',
      ],
      presets: [
        {
          from: 'zod',
          imports: ['z'],
        },
      ],
    },
  },

  security: {
    headers: {
      contentSecurityPolicy: {
        'img-src': [
          'data:',
        ],
      },
    },
    rateLimiter: process.env.NODE_ENV === 'production' ? undefined : false,
  },

  site: {
    name: pkgName,
  },

  vite: {
    plugins: [tailwindcss()],
  },
})
