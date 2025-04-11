/**
 * This script monitors memory usage of the Next.js server.
 * Run with: node scripts/monitor-memory.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const POLL_INTERVAL = 5000; // Check every 5 seconds
const LOG_FILE = path.join(__dirname, '../logs/memory-usage.log');
const ALERT_THRESHOLD_MB = 1024; // Alert if RSS exceeds 1GB
const SNAPSHOT_DIR = path.join(__dirname, '../logs/heap-snapshots');

// Ensure log directories exist
if (!fs.existsSync(path.dirname(LOG_FILE))) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}
if (!fs.existsSync(SNAPSHOT_DIR)) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

// Function to find the Next.js server process
function findNextProcess() {
  return new Promise((resolve, reject) => {
    // Platform-specific commands
    let cmd;
    if (process.platform === 'win32') {
      cmd = 'tasklist /FI "IMAGENAME eq node.exe" /FO CSV';
    } else if (process.platform === 'darwin') {
      // macOS specific command
      cmd = 'ps -eo pid,command | grep "[n]ode.*server.js"';
    } else {
      // Linux/Unix command
      cmd = 'ps -eo pid,comm,args | grep "[n]ode.*server.js"';
    }
    
    exec(cmd, (err, stdout) => {
      if (err && err.code !== 1) {
        return reject(err);
      }
      
      if (!stdout.trim()) {
        return reject(new Error('Next.js server process not found'));
      }
      
      let pid;
      if (process.platform === 'win32') {
        // Parse Windows tasklist output
        const lines = stdout.trim().split('\n');
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',');
          if (parts[1] && parts[1].includes('server.js')) {
            pid = parts[0].replace(/"/g, '');
            break;
          }
        }
      } else {
        // Parse Unix/macOS ps output
        const lines = stdout.trim().split('\n');
        if (lines.length > 0) {
          pid = lines[0].trim().split(/\s+/)[0];
        }
      }
      
      if (!pid) {
        return reject(new Error('Next.js server process not found'));
      }
      
      resolve(pid);
    });
  });
}

// Function to get memory usage of a process
function getMemoryUsage(pid) {
  return new Promise((resolve, reject) => {
    let cmd;
    if (process.platform === 'win32') {
      cmd = `powershell "Get-Process -Id ${pid} | Select-Object -ExpandProperty WorkingSet | ForEach-Object { $_ / 1MB }"`;
    } else if (process.platform === 'darwin') {
      // macOS specific command
      cmd = `ps -p ${pid} -o rss=`;
    } else {
      // Linux/Unix command
      cmd = `ps -p ${pid} -o rss=`;
    }
    
    exec(cmd, (err, stdout) => {
      if (err) {
        return reject(err);
      }
      
      const memoryMB = parseInt(stdout.trim()) / (process.platform === 'win32' ? 1 : 1024);
      resolve(memoryMB);
    });
  });
}

// Function to take a heap snapshot if supported
function takeHeapSnapshot(pid) {
  const filename = path.join(SNAPSHOT_DIR, `heapdump-${Date.now()}.heapsnapshot`);
  console.log(`🔍 Taking heap snapshot to ${filename}...`);
  
  // Only works if Node.js was started with --inspect flag
  exec(`node --inspect-brk=${pid} -e "process._debugEnd()"`, (err) => {
    if (err) {
      console.error('❌ Failed to take heap snapshot:', err.message);
      console.log('💡 To enable heap snapshots, start your server with NODE_OPTIONS="--inspect" npm run dev');
    } else {
      console.log(`✅ Heap snapshot saved to ${filename}`);
    }
  });
}

// Alternate method to get active node processes if standard method fails
function findNodeProcessesAlternate() {
  return new Promise((resolve, reject) => {
    let cmd;
    if (process.platform === 'darwin') {
      cmd = 'ps -eo pid,comm | grep -i node';
    } else if (process.platform === 'win32') {
      cmd = 'tasklist /FI "IMAGENAME eq node.exe" /FO CSV';
    } else {
      cmd = 'ps -eo pid,comm | grep -i node';
    }
    
    exec(cmd, (err, stdout) => {
      if (err && err.code !== 1) {
        return reject(err);
      }
      
      console.log('Available Node.js processes:');
      console.log(stdout);
      
      // Let user select a process
      console.log('No Next.js server process found automatically.');
      console.log('Please start the server with: pnpm run dev-high-memory');
      
      resolve(null);
    });
  });
}

// Main monitoring function
async function monitor() {
  try {
    let pid;
    try {
      pid = await findNextProcess();
    } catch (error) {
      console.error('❌ Error finding Next.js process:', error.message);
      await findNodeProcessesAlternate();
      return;
    }
    
    console.log(`📊 Monitoring Next.js server (PID: ${pid})...`);
    
    let previousMemoryMB = 0;
    let highMemoryAlertSent = false;
    
    // Start monitoring loop
    setInterval(async () => {
      try {
        const memoryMB = await getMemoryUsage(pid);
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp} | PID: ${pid} | Memory: ${memoryMB.toFixed(2)} MB | Change: ${(memoryMB - previousMemoryMB).toFixed(2)} MB\n`;
        
        // Log to file
        fs.appendFileSync(LOG_FILE, logEntry);
        
        // Log to console
        console.log(`💾 ${timestamp} | Memory: ${memoryMB.toFixed(2)} MB | Change: ${(memoryMB - previousMemoryMB).toFixed(2)} MB`);
        
        // Check for potential memory leak
        if (memoryMB > previousMemoryMB + 100 && previousMemoryMB > 0) {
          console.warn(`⚠️ Potential memory leak detected! Increase of ${(memoryMB - previousMemoryMB).toFixed(2)} MB`);
        }
        
        // Alert on high memory usage
        if (memoryMB > ALERT_THRESHOLD_MB && !highMemoryAlertSent) {
          console.error(`🚨 High memory usage detected: ${memoryMB.toFixed(2)} MB exceeds threshold of ${ALERT_THRESHOLD_MB} MB`);
          highMemoryAlertSent = true;
          takeHeapSnapshot(pid);
        } else if (memoryMB < ALERT_THRESHOLD_MB * 0.8) {
          // Reset alert when memory drops below 80% of threshold
          highMemoryAlertSent = false;
        }
        
        previousMemoryMB = memoryMB;
      } catch (error) {
        console.error('❌ Error monitoring memory:', error.message);
      }
    }, POLL_INTERVAL);
    
  } catch (error) {
    console.error('❌ Failed to start monitoring:', error.message);
    process.exit(1);
  }
}

// Start monitoring
monitor().catch(console.error);

console.log(`📝 Memory logs will be written to: ${LOG_FILE}`);
console.log(`🔍 Heap snapshots will be saved to: ${SNAPSHOT_DIR}`);
console.log('💡 Press Ctrl+C to stop monitoring'); 