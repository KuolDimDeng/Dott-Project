const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// Get environment variables
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// SSL options for local development
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, './certificates/localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, './certificates/localhost.pem')),
};

// Prepare Next.js app
app.prepare().then(() => {
  // Create HTTPS server
  createServer(httpsOptions, (req, res) => {
    try {
      // Parse URL
      const parsedUrl = parse(req.url, true);
      
      // Let Next.js handle the request
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    
    console.log(`> Ready on https://${hostname}:${port}`);
    console.log('> HTTPS server successfully started');
  });
});
