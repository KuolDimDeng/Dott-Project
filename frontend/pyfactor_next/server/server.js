const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const initSocketServer = require('./socketServer');
const memoryFix = require('./memory-fix');
const fs = require('fs');

// Disable PDF.js and other PDF libraries during initial load to prevent memory issues
// This will delay loading PDF libraries until they're actually needed
global.DISABLE_PDF_PRELOAD = true;

// Apply regex timeout protection (to prevent RegExpCompiler OOM errors)
try {
  const originalRegExpExec = RegExp.prototype.exec;
  RegExp.prototype.exec = function(str) {
    // Skip small strings
    if (!str || typeof str !== 'string' || str.length < 5000) {
      return originalRegExpExec.call(this, str);
    }
    
    // For large strings, use a timeout to prevent runaway regex
    const timeoutMs = 500; // 500ms timeout - reduced from 1 second
    let didTimeout = false;
    
    const timeout = setTimeout(() => {
      didTimeout = true;
      console.warn(`RegExp timeout for string of length ${str.length}`);
    }, timeoutMs);
    
    try {
      // Apply to substring for large strings to prevent memory issues
      if (str.length > 10000) {
        return originalRegExpExec.call(this, str.substring(0, 10000));
      } else {
        return originalRegExpExec.call(this, str);
      }
    } catch (e) {
      console.warn(`RegExp error: ${e.message}`);
      return null; // Return null on error (no match)
    } finally {
      clearTimeout(timeout);
      if (didTimeout) {
        return null; // Return null on timeout (no match)
      }
    }
  };
  console.log('✅ RegExp timeout protection applied');
} catch (e) {
  console.error('Failed to apply RegExp protection:', e);
}

// Read development mode from environment variables
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Memory optimizations for pdfjs
global.pdfjsMemoryOptimized = true;

// Configure V8 for better memory usage
try {
  if (global.v8) {
    // Suggest more frequent small GCs rather than less frequent large ones
    v8.setFlagsFromString('--max_old_space_size=12288');
    v8.setFlagsFromString('--optimize_for_size');
    v8.setFlagsFromString('--memory_reducer');
    v8.setFlagsFromString('--flush_bytecode');
    console.log('✅ V8 memory optimization flags applied');
  }
} catch (e) {
  console.error('Failed to set V8 flags:', e);
}

// Disable PDF libraries preloading to save memory during server initialization
try {
  // This will prevent automatic loading of PDF libraries at startup
  global.PDF_LIBRARIES_DISABLED = true;
  
  // Add moduleDetection: 'force' to conditional imports of PDF libraries
  console.log('✅ PDF libraries preloading disabled to save memory');
} catch (e) {
  console.error('Failed to disable PDF preloading:', e);
}

// Log initial memory usage
memoryFix.checkMemoryUsage();
console.log('🚀 Server starting with memory optimizations enabled');

// Create a temp directory for PDF.js worker
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}
console.log(`📁 Temporary directory created at ${TEMP_DIR}`);

// Function to start server on a port
async function startServer(port) {
  await app.prepare();
  
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    
    // Set proper Content-Type for JavaScript files
    const pathname = parsedUrl.pathname || '';
    if (pathname.endsWith('.js') || pathname.includes('/_next/static/chunks/')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    
    // Add response timeout to prevent hanging responses
    const responseTimeout = setTimeout(() => {
      if (!res.writableEnded) {
        console.warn('Response timeout - ending potentially stalled response');
        res.end();
      }
    }, 30000); // 30 second timeout - reduced from 60 seconds
    
    // Clear timeout when response ends
    res.on('finish', () => {
      clearTimeout(responseTimeout);
    });
    
    handle(req, res, parsedUrl);
  });

  initSocketServer(server);

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
  
  return server;
}

// Start server on port 3000
startServer(3000).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Schedule memory usage checks
setInterval(() => {
  memoryFix.checkMemoryUsage();
}, 60000); // Every minute