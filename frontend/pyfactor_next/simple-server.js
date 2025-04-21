const next = require('next');
const { createServer } = require('http');
const { parse } = require('url');

// Create the Next.js app in dev mode
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Set up the server
async function startServer() {
  try {
    // Prepare the Next.js app
    await app.prepare();
    console.log('Next.js app prepared successfully');
    
    // Create a simple server
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });
    
    // Start listening on port 3000
    server.listen(3000, (err) => {
      if (err) throw err;
      console.log('> Ready on https://localhost:3000');
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start the server
startServer(); 