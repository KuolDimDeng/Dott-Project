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
      console.log('[CONFIG] Next.js server environment variables loaded:');
      console.log('NODE_ENV:', process.env.NODE_ENV);
      console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Set' : 'Not set');
      console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
      console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set');
      console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set');
      console.log('[CONFIG] Finished loading server-side environment variables.');
    }

    return config;
  },

  async headers() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '*';
    const authOrigin = process.env.NEXT_PUBLIC_AUTH_ORIGIN || 'https://dev-7746mv6eia143tp3.us.auth0.com';

    console.log('[CONFIG] Setting up CORS headers.');
    console.log('Allowed API URL:', apiUrl);
    console.log('Auth Origin:', authOrigin);

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
            value: authOrigin,
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: apiUrl },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ];
  },
  images: {
    domains: ['localhost'],
    unoptimized: true,

  },

  poweredByHeader: false,
};

export default nextConfig;
