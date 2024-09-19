import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  // ... your other configurations
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
      '@src': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/app/components'),
      '@contexts': path.resolve(__dirname, 'src/contexts'),
      '@utils': path.resolve(__dirname, 'utils'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@app': path.resolve(__dirname, 'src/app'),
    };
    return config;
  },
  transpilePackages: ['@mui/x-charts'],
};

export default nextConfig;