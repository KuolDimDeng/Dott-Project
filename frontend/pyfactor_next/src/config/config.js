// config.js - Environment variable configuration loader
// Created 2025-06-06

const config = {
  auth0: {
    domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    scope: process.env.AUTH0_SCOPE,
    issuerBaseUrl: process.env.AUTH0_ISSUER_BASE_URL,
    baseUrl: process.env.AUTH0_BASE_URL
  },
  app: {
    baseUrl: process.env.APP_BASE_URL
  }
};

export default config;
