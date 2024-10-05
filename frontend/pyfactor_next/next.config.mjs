///Users/kuoldeng/projectx/frontend/pyfactor_next/next.config.mjs
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };

    if (isServer) {
      console.log('Next.js Config - Environment Variables:');
      console.log('NODE_ENV:', process.env.NODE_ENV);
      console.log('AUTH0_SECRET:', process.env.AUTH0_SECRET ? 'Set' : 'Not set');
      console.log('AUTH0_BASE_URL:', process.env.AUTH0_BASE_URL);
      console.log('AUTH0_ISSUER_BASE_URL:', process.env.AUTH0_ISSUER_BASE_URL);
      console.log('AUTH0_CLIENT_ID:', process.env.AUTH0_CLIENT_ID ? 'Set' : 'Not set');
      console.log('AUTH0_CLIENT_SECRET:', process.env.AUTH0_CLIENT_SECRET ? 'Set' : 'Not set');
      console.log('AUTH0_SCOPE:', process.env.AUTH0_SCOPE);
    }

    return config;
  },

  serverRuntimeConfig: {
    auth0: {
      secret: process.env.AUTH0_SECRET,
      baseURL: process.env.AUTH0_BASE_URL,
      issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
      clientID: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Set-Cookie',
            value: 'SameSite=Lax; Secure; HttpOnly; Path=/',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://dev-7746mv6eia143tp3.us.auth0.com',
          },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },

        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  poweredByHeader: false,
};

export default nextConfig;