// AWS Lambda handler for Next.js SSR
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const serverless = require('serverless-http');

const dev = false;
// Use environment variable for hostname, fallback to localhost for Lambda
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT) || 3000;

// Set production environment variables
process.env.NODE_ENV = 'production';
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
process.env.BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://api.dottapps.com';
process.env.USE_DATABASE = 'true';
process.env.MOCK_DATA_DISABLED = 'true';
process.env.PROD_MODE = 'true';

// Initialize Next.js app
const app = next({ 
  dev, 
  hostname, 
  port, 
  dir: __dirname,
  conf: {
    // Override hostname for Next.js internal operations
    env: {
      HOSTNAME: 'dottapps.com',
      ...process.env
    }
  }
});
const handle = app.getRequestHandler();

let isReady = false;

const server = createServer(async (req, res) => {
  try {
    // Ensure Next.js is ready
    if (!isReady) {
      await app.prepare();
      isReady = true;
      console.log('Next.js app prepared for dottapps.com');
    }
    
    // Override host header for Next.js to recognize the correct domain
    if (req.headers.host && req.headers.host.includes('amazonaws.com')) {
      req.headers.host = 'dottapps.com';
    }
    
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  } catch (err) {
    console.error('Error occurred handling', req.url, err);
    res.statusCode = 500;
    res.end('Internal server error');
  }
});

// Export the serverless handler
module.exports.handler = serverless(server, {
  binary: ['image/*', 'font/*', 'application/octet-stream'],
}); 