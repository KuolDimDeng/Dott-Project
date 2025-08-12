// next-i18next.config.mjs
export const i18n = {
  defaultLocale: 'en',
  locales: [
    'en', 'es', 'fr', 'pt', 'de', 'zh', 'ar', 'hi', 'ru', 'ja', 'sw', 'tr', 'id', 'vi', 'nl',
    'ha', 'yo', 'am', 'zu', 'ko', 'it', 'pl', 'th', 'bn', 'ur', 'tl', 'uk', 'fa', 'sn', 'ig'
  ],
  localeDetection: true,
};

export default {
  i18n,
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};