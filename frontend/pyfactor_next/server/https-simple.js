/**
 * Simplified HTTPS Server for Next.js
 */

const https = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// Basic Next.js setup
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// SSL certificate paths
const CERT_DIR = path.join(process.cwd(), '../..', 'certificates');
const SSL_KEY_FILE = path.join(CERT_DIR, 'localhost+1-key.pem');
const SSL_CERT_FILE = path.join(CERT_DIR, 'localhost+1.pem');

// Disable SSL certificate validation for local development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function start() {
  try {
    // Prepare Next.js
    await app.prepare();
    
    // Create HTTPS server options
    const httpsOptions = {
      key: fs.readFileSync(SSL_KEY_FILE),
      cert: fs.readFileSync(SSL_CERT_FILE)
    };
    
    // Create server
    const server = https.createServer(httpsOptions, (req, res) => {
      // Parse URL
      const parsedUrl = parse(req.url, true);
      
      // Let Next.js handle the request
      handle(req, res, parsedUrl);
    });
    
    // Listen on port 3000
    server.listen(3000, (err) => {
      if (err) throw err;
      console.log('> HTTPS Server ready on https://localhost:3000');
      console.log(`> Using SSL certificates from ${CERT_DIR}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start the server
start(); 