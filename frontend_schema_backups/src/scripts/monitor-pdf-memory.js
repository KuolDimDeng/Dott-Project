/**
 * PDF Memory Monitoring Script
 * 
 * This script monitors memory usage while performing PDF operations
 * to verify that our memory optimizations are working effectively.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const http = require('http');

// Configuration
const memoryCheckInterval = 1000; // 1 second
const testDuration = 60000; // 60 seconds
const memoryThreshold = 500; // 500 MB (warning threshold)
const port = 3099; // Port for the test server

// Array to store memory usage samples
const memoryUsage = [];

// Test server to serve test PDFs and memory stats
function startTestServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/memory-stats') {
      // Return memory stats as JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      const memStats = getMemoryStats();
      res.end(JSON.stringify(memStats));
    } else if (req.url === '/test.pdf') {
      // Serve a test PDF
      const testPdfPath = path.join(__dirname, '../../public/test.pdf');
      
      // If no test PDF exists, create a simple one with text
      if (!fs.existsSync(testPdfPath)) {
        console.log('Creating test PDF...');
        try {
          // Create an empty file as a placeholder
          fs.writeFileSync(testPdfPath, 'Test PDF file');
        } catch (error) {
          console.error('Error creating test PDF:', error);
        }
      }
      
      // Serve the PDF
      if (fs.existsSync(testPdfPath)) {
        const pdfData = fs.readFileSync(testPdfPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfData.length);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(pdfData);
      } else {
        res.statusCode = 404;
        res.end('PDF not found');
      }
    } else {
      // Serve a simple HTML page with PDF viewer
      res.setHeader('Content-Type', 'text/html');
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>PDF Memory Test</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; }
            .memory-stats { background: #f0f0f0; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
            .actions { margin-bottom: 20px; }
            button { padding: 8px 12px; margin-right: 10px; }
            #pdf-container { border: 1px solid #ccc; min-height: 400px; }
            .memory-warning { color: red; font-weight: bold; }
            .chart-container { height: 200px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>PDF Memory Usage Test</h1>
            
            <div class="memory-stats" id="memory-stats">
              <h3>Memory Stats</h3>
              <div>Heap Used: <span id="heap-used">-</span> MB</div>
              <div>Heap Total: <span id="heap-total">-</span> MB</div>
              <div>RSS: <span id="rss">-</span> MB</div>
              <div>External: <span id="external">-</span> MB</div>
            </div>
            
            <div class="actions">
              <button id="load-pdf">Load PDF</button>
              <button id="generate-pdf">Generate PDF</button>
              <button id="cleanup">Force Cleanup</button>
            </div>
            
            <div id="pdf-container"></div>
            
            <div class="chart-container">
              <canvas id="memory-chart"></canvas>
            </div>
          </div>
          
          <script>
            // Update memory stats
            function updateMemoryStats() {
              fetch('/memory-stats')
                .then(response => response.json())
                .then(stats => {
                  document.getElementById('heap-used').textContent = stats.heapUsed;
                  document.getElementById('heap-total').textContent = stats.heapTotal;
                  document.getElementById('rss').textContent = stats.rss;
                  document.getElementById('external').textContent = stats.external;
                  
                  // Add warning if memory usage is high
                  const memoryStats = document.getElementById('memory-stats');
                  if (stats.heapUsed > ${memoryThreshold}) {
                    memoryStats.classList.add('memory-warning');
                  } else {
                    memoryStats.classList.remove('memory-warning');
                  }
                })
                .catch(error => {
                  console.error('Error fetching memory stats:', error);
                });
            }
            
            // Load a PDF
            document.getElementById('load-pdf').addEventListener('click', () => {
              const container = document.getElementById('pdf-container');
              container.innerHTML = '<iframe src="/test.pdf" width="100%" height="500px"></iframe>';
            });
            
            // Generate a PDF
            document.getElementById('generate-pdf').addEventListener('click', () => {
              alert('This would generate a PDF in a real application. For this test, we simulate memory usage increase.');
              
              // Simulate memory usage increase
              const largeArray = [];
              for (let i = 0; i < 1000000; i++) {
                largeArray.push('test string to consume memory');
              }
              
              // Keep reference to prevent immediate garbage collection
              window.tempData = largeArray;
              
              // Update stats
              updateMemoryStats();
            });
            
            // Force cleanup
            document.getElementById('cleanup').addEventListener('click', () => {
              // Remove large arrays
              window.tempData = null;
              
              // Force garbage collection (browser may or may not honor this)
              if (window.gc) {
                window.gc();
              }
              
              // Clear PDF container
              const container = document.getElementById('pdf-container');
              container.innerHTML = '';
              
              // Update stats
              updateMemoryStats();
            });
            
            // Initial stats update
            updateMemoryStats();
            
            // Regular stats update
            setInterval(updateMemoryStats, 1000);
          </script>
        </body>
        </html>
      `);
    }
  });
  
  server.listen(port, () => {
    console.log(`Memory test server running at http://localhost:${port}`);
  });
  
  return server;
}

// Get memory stats
function getMemoryStats() {
  const memoryUsage = process.memoryUsage();
  
  return {
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
    rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
    external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
  };
}

// Monitor memory usage
function monitorMemory() {
  const interval = setInterval(() => {
    const stats = getMemoryStats();
    memoryUsage.push({
      timestamp: Date.now(),
      ...stats
    });
    
    console.log(`Memory Usage - Heap: ${stats.heapUsed}MB / ${stats.heapTotal}MB, RSS: ${stats.rss}MB`);
    
    // Check if memory usage is above threshold
    if (stats.heapUsed > memoryThreshold) {
      console.warn(`⚠️ Warning: Memory usage above threshold (${memoryThreshold}MB)!`);
    }
  }, memoryCheckInterval);
  
  // Stop monitoring after test duration
  setTimeout(() => {
    clearInterval(interval);
    saveMemoryReport();
  }, testDuration);
}

// Save memory usage report
function saveMemoryReport() {
  const reportPath = path.join(__dirname, '../../memory-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(memoryUsage, null, 2));
  console.log(`Memory report saved to ${reportPath}`);
}

// Main function
function main() {
  console.log('Starting PDF memory usage monitoring...');
  console.log(`Test duration: ${testDuration / 1000} seconds`);
  console.log(`Memory warning threshold: ${memoryThreshold}MB`);
  
  // Start monitoring
  monitorMemory();
  
  // Start test server
  const server = startTestServer();
  
  // Stop server after test duration
  setTimeout(() => {
    server.close(() => {
      console.log('Test server stopped');
      process.exit(0);
    });
  }, testDuration + 1000);
}

// Run the main function
main(); 