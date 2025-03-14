#!/usr/bin/env node

/**
 * Optimized Development Server Script
 * 
 * This script runs the Next.js development server with optimized memory settings
 * to prevent memory leaks and reduce overall memory usage.
 * 
 * Usage:
 * node run-optimized-dev.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const MAX_MEMORY = 8192; // 8GB max memory
const RESTART_THRESHOLD = 4096; // 4GB restart threshold
const CHECK_INTERVAL = 30000; // Check memory every 30 seconds
const LOG_FILE = path.join(__dirname, 'memory-usage.log');

// Clear previous log file
if (fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '');
}

// Log with timestamp
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Get memory usage in MB
function getMemoryUsage() {
  const memoryUsage = process.memoryUsage();
  return {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024),
  };
}

// Start Next.js server with optimized settings
function startServer() {
  log('Starting Next.js development server with optimized memory settings...');
  
  // Set environment variables for optimization
  const env = {
    ...process.env,
    NODE_OPTIONS: `--max-old-space-size=${MAX_MEMORY} --expose-gc`,
    NEXT_TELEMETRY_DISABLED: '1', // Disable telemetry to save memory
    NEXT_OPTIMIZE_MEMORY: '1', // Custom flag for our memory optimizations
  };
  
  // Start Next.js server
  const nextDev = spawn('npx', ['next', 'dev'], {
    env,
    stdio: 'inherit',
    shell: true,
  });
  
  // Handle server exit
  nextDev.on('exit', (code, signal) => {
    if (code !== 0) {
      log(`Next.js server exited with code ${code} and signal ${signal}`);
      log('Restarting server...');
      startServer();
    }
  });
  
  // Set up memory monitoring
  const memoryInterval = setInterval(() => {
    const memory = getMemoryUsage();
    log(`Memory usage: RSS: ${memory.rss}MB, Heap: ${memory.heapUsed}MB/${memory.heapTotal}MB`);
    
    // Check if memory usage is approaching threshold
    if (memory.rss > RESTART_THRESHOLD) {
      log(`Memory usage exceeded threshold (${RESTART_THRESHOLD}MB), restarting server...`);
      clearInterval(memoryInterval);
      nextDev.kill('SIGTERM');
    }
  }, CHECK_INTERVAL);
  
  // Handle process termination
  process.on('SIGINT', () => {
    log('Received SIGINT, shutting down...');
    clearInterval(memoryInterval);
    nextDev.kill('SIGTERM');
    process.exit(0);
  });
  
  return nextDev;
}

// Start the server
startServer();

log('Memory optimization script running. Press Ctrl+C to stop.');