import axios from 'axios';
import { logger } from '@/utils/logger';
import https from 'https';

// Create a server-side axios instance with no interceptors 
// for use in server components and API routes
const serverAxiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Disable SSL verification for local development
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // Disable SSL certificate verification
  })
});

// Fix proper BACKEND_URL configuration for server-side requests
serverAxiosInstance.interceptors.request.use(
  (config) => {
    // Set a proper base URL for backend API requests
    if (config.url?.startsWith('/api/') && !config.baseURL) {
      // Use environment variable or fallback to localhost
      let backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';
      
      // Ensure backendUrl always has a protocol
      if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
        backendUrl = `https://${backendUrl}`;
      }
      
      // Log the baseURL being used for debugging
      logger.debug('[ServerAxiosConfig] Setting backend URL for server request:', { 
        url: config.url,
        backendUrl
      });
      
      // Update the config with the correct baseURL
      config.baseURL = backendUrl;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

logger.debug('[ServerAxiosConfig] Server axios instance initialized with SSL verification disabled for local development');

// Export the server axios instance
export { serverAxiosInstance }; 