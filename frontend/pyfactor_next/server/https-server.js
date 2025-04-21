/**
 * HTTPS Server for Next.js
 * 
 * This file implements a custom HTTPS server for the Next.js application
 * using the SSL certificates generated with mkcert.
 */

const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware'); 

// Read development mode from environment variables
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Set up certificates paths
const CERT_DIR = path.join(process.cwd(), '../..', 'certificates');
const SSL_KEY_FILE = process.env.SSL_KEY_FILE || path.join(CERT_DIR, 'localhost+1-key.pem');
const SSL_CERT_FILE = process.env.SSL_CRT_FILE || path.join(CERT_DIR, 'localhost+1.pem');

// Check if certificates exist
if (!fs.existsSync(SSL_KEY_FILE) || !fs.existsSync(SSL_CERT_FILE)) {
  console.error('❌ SSL certificates not found!');
  console.error(`Expected certificate files at: ${SSL_KEY_FILE} and ${SSL_CERT_FILE}`);
  console.error('Please ensure mkcert has been properly set up.');
  process.exit(1);
}

console.log('🚀 HTTPS Server starting with SSL certificates');
console.log(`Using key: ${SSL_KEY_FILE}`);
console.log(`Using cert: ${SSL_CERT_FILE}`);

// Disable SSL validation for development (Note: only for local development)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Backend API URL from environment variables
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://127.0.0.1:8000';
console.log(`Using backend API URL: ${BACKEND_API_URL}`);

// Function to start HTTPS server on a port
async function startServer(port) {
  try {
    await app.prepare();
    
    const httpsOptions = {
      key: fs.readFileSync(SSL_KEY_FILE),
      cert: fs.readFileSync(SSL_CERT_FILE)
    };
    
    const server = createServer(httpsOptions, async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        
        
        // Handle API proxy for backend
        if (parsedUrl.pathname && parsedUrl.pathname.startsWith('/api/')) {
          console.log('Proxying request to backend: ' + parsedUrl.pathname);
          
          const proxy = createProxyMiddleware({
            target: BACKEND_API_URL,
            changeOrigin: true,
            secure: false, // Disable SSL validation for local development
            pathRewrite: { '^/api': '/api' },
            onProxyReq: (proxyReq) => {
              // Add any necessary headers for backend
              proxyReq.setHeader('x-forwarded-proto', 'https');
              
              // Add custom headers to help with debugging
              proxyReq.setHeader('x-frontend-url', req.headers.host || 'localhost:3000');
              proxyReq.setHeader('x-request-id', Math.random().toString(36).substring(2, 15));
            },
            onProxyRes: (proxyRes, req, res) => {
              // Add CORS headers for development
              proxyRes.headers['Access-Control-Allow-Origin'] = '*';
              proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
              proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Tenant-ID';
              
              // Mitigate connection issues
              proxyRes.headers['Connection'] = 'close';
            },
            onError: (err, req, res) => {
              console.error('Proxy error:', err);
              
              // Return a more helpful error response
              res.writeHead(502, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              
              // Include information to help debugging
              res.end(JSON.stringify({
                error: 'Backend connection error',
                message: err.message,
                code: err.code,
                path: req.url,
                timestamp: new Date().toISOString(),
                backend: BACKEND_API_URL,
                solutions: [
                  'Ensure backend server is running at ' + BACKEND_API_URL,
                  'Check for valid SSL certificates',
                  'Verify network connectivity between frontend and backend'
                ]
              }));
            },
            // Increase timeout to prevent quick failures
            proxyTimeout: 30000,
            timeout: 30000
          });
          
          return proxy(req, res, () => {
            // Continue to Next.js if proxy doesn't handle it
            handle(req, res, parsedUrl);
          });
        }
        } else {
          // Let Next.js handle all other requests
          await handle(req, res, parsedUrl);
        }
      } catch (err) {
        console.error('Error handling request:', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    }
    
    // Add error recovery for proxy connections
    server.on('error', (error) => {
      console.error('HTTPS Server error:', error);
      // Try to restart the server on certain errors
      if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
        console.log('Connection reset or broken pipe, attempting recovery...');
      }
    });
    
    // Increase default timeout for connections
    server.setTimeout(120000); // 2 minutes
    
    // Periodically check backend connectivity
    setInterval(() => {
      try {
        const healthCheck = https.request(BACKEND_API_URL + '/api/health', {
          method: 'GET',
          timeout: 5000,
          rejectUnauthorized: false
        }, (res) => {
          // Consume response data to free up memory
          res.resume();
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Backend health check: OK');
          } else {
            console.warn('Backend health check: HTTP ' + res.statusCode);
          }
        });
        
        healthCheck.on('error', (err) => {
          console.error('Backend health check failed:', err.message);
        });
        
        healthCheck.end();
      } catch (err) {
        console.error('Error during backend health check:', err);
      }
    }, 30000); // Every 30 seconds);
    
    server.listen(port, () => {
      console.log(`✅ HTTPS Server ready at https://localhost:${port}`);
    });
    
    // Handle server errors
    server.on('error', (e) => {
      console.error('Server error:', e);
      if (e.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please close any other servers running on this port.`);
      }
      process.exit(1);
    });
    
    return server;
  } catch (error) {
    console.error('Failed to start HTTPS server:', error);
    process.exit(1);
  }
}

// Start server on port 3000
const PORT = parseInt(process.env.PORT || '3000', 10);
startServer(PORT).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Handle cleanup
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down server');
  process.exit(0);
}); 