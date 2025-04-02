const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const initSocketServer = require('./socketServer');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Function to attempt to start server on a port
function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      
      // Set proper Content-Type for JavaScript files
      const pathname = parsedUrl.pathname || '';
      if (pathname.endsWith('.js') || pathname.includes('/_next/static/chunks/')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }
      
      handle(req, res, parsedUrl);
    });

    const io = initSocketServer(server);

    // Try to listen on the port
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying another port...`);
        resolve(false);
      } else {
        reject(err);
      }
    });

    server.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
      resolve(true);
    });
  });
}

app.prepare().then(async () => {
  // Try ports starting from 3000, then 3001, 3002, etc.
  let port = 3000;
  const maxPort = 3010; // Try up to port 3010
  
  while (port <= maxPort) {
    const success = await startServer(port);
    if (success) {
      break;
    }
    port++;
  }
  
  if (port > maxPort) {
    console.error(`Could not find an available port between 3000 and ${maxPort}`);
    process.exit(1);
  }
});