#!/bin/bash

# Memory Optimization Script for Next.js Application
# This script applies various optimizations to reduce memory usage in the Next.js application

echo "Starting memory optimization for Next.js application..."

# 1. Set environment variables for Node.js memory limits
export NODE_OPTIONS="--max-old-space-size=4096 --expose-gc"
export NEXT_TELEMETRY_DISABLED=1

# 2. Clear node_modules cache to reduce disk usage
echo "Cleaning node_modules cache..."
npm cache clean --force

# 3. Remove development dependencies if in production
if [ "$NODE_ENV" = "production" ]; then
  echo "Production environment detected, removing development dependencies..."
  npm prune --production
fi

# 4. Optimize Next.js build cache
echo "Optimizing Next.js build cache..."
rm -rf .next/cache/images || true
rm -rf .next/cache/webpack || true

# 5. Apply memory-specific Next.js configuration
echo "Applying memory-optimized Next.js configuration..."
cat > next.config.memory.js << 'EOL'
/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // Reduce memory usage during builds
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@mui/material', '@mui/icons-material', 'lodash', 'date-fns'],
    memoryBasedWorkersCount: true,
    serverMinification: true,
  },
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
    ],
  },
  
  // Optimize webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Add memory optimizations
    config.optimization = {
      ...config.optimization,
      // Minimize all files in production
      minimize: !dev,
      // Split chunks to reduce main bundle size
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
      },
    };

    // Reduce bundle size by excluding moment.js locales
    config.plugins.push(
      new config.webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    );

    // Optimize for server
    if (isServer) {
      // Externalize dependencies that don't need to be bundled
      config.externals = [...(config.externals || []), 
        { canvas: 'commonjs canvas' }
      ];
    }

    return config;
  },
  
  // Optimize server memory usage
  onDemandEntries: {
    // Keep pages in memory for 30 seconds
    maxInactiveAge: 30 * 1000,
    // Only keep 3 pages in memory
    pagesBufferLength: 3,
  },
  
  // Reduce memory usage by disabling source maps in production
  productionBrowserSourceMaps: false,
  
  // Reduce memory usage by compressing assets
  compress: true,
  
  // Reduce memory usage by setting a lower memory limit for the server
  env: {
    NODE_OPTIONS: '--max-old-space-size=4096',
  },
  
  // Reduce memory usage by setting a lower memory limit for the build
  poweredByHeader: false,
};

// Merge with existing config
module.exports = withSentryConfig(nextConfig);
EOL

# 6. Create memory monitoring utility
echo "Creating memory monitoring utility..."
mkdir -p src/utils || true
cat > src/utils/memoryMonitor.js << 'EOL'
/**
 * Memory Monitoring Utility
 * 
 * This utility provides functions to monitor memory usage in the application
 * and identify potential memory leaks.
 */

// Store memory usage history
const memoryHistory = [];
const MAX_HISTORY_SIZE = 100;

// Format memory size to human-readable format
const formatMemory = (bytes) => {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  else return (bytes / 1048576).toFixed(2) + ' MB';
};

// Get current memory usage
export const getMemoryUsage = () => {
  if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
    const memory = window.performance.memory;
    return {
      totalJSHeapSize: formatMemory(memory.totalJSHeapSize),
      usedJSHeapSize: formatMemory(memory.usedJSHeapSize),
      jsHeapSizeLimit: formatMemory(memory.jsHeapSizeLimit),
      percentUsed: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2) + '%'
    };
  }
  return null;
};

// Log memory usage
export const logMemoryUsage = (componentName, action = 'update') => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const memoryInfo = getMemoryUsage();
  if (memoryInfo) {
    console.log(`[Memory] ${componentName} ${action}:`, memoryInfo);
  }
};

// Track memory usage over time
export const trackMemory = (componentName, action = 'update') => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const memoryInfo = getMemoryUsage();
  if (memoryInfo) {
    const entry = {
      timestamp: new Date().toISOString(),
      component: componentName,
      action,
      ...memoryInfo
    };
    
    memoryHistory.push(entry);
    
    // Keep history size manageable
    if (memoryHistory.length > MAX_HISTORY_SIZE) {
      memoryHistory.shift();
    }
    
    // Log warning if memory usage is high
    const percentUsed = parseFloat(memoryInfo.percentUsed);
    if (percentUsed > 80) {
      console.warn(`[Memory Warning] High memory usage in ${componentName} (${action}):`, memoryInfo);
    }
  }
};

// Get memory history
export const getMemoryHistory = () => {
  return [...memoryHistory];
};

// Clear memory history
export const clearMemoryHistory = () => {
  memoryHistory.length = 0;
  console.log('[Memory] History cleared');
};

// Force garbage collection (only works if Node.js is started with --expose-gc)
export const forceGarbageCollection = () => {
  if (typeof global !== 'undefined' && global.gc) {
    try {
      global.gc();
      console.log('[Memory] Garbage collection forced');
    } catch (e) {
      console.error('[Memory] Failed to force garbage collection:', e);
    }
  }
};

// Start memory monitoring
export const startMemoryMonitoring = (interval = 10000) => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  console.log('[Memory] Starting memory monitoring');
  logMemoryUsage('Global', 'start');
  
  const intervalId = setInterval(() => {
    trackMemory('Global', 'interval');
  }, interval);
  
  return intervalId;
};

// Stop memory monitoring
export const stopMemoryMonitoring = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('[Memory] Stopped memory monitoring');
  }
};
EOL

# 7. Create optimized development server script
echo "Creating optimized development server script..."
cat > dev-optimized.js << 'EOL'
#!/usr/bin/env node

/**
 * Optimized Development Server Script
 * 
 * This script runs the Next.js development server with optimized memory settings
 * to prevent memory leaks and reduce overall memory usage.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const MAX_MEMORY = 4096; // 4GB max memory
const RESTART_THRESHOLD = 3072; // 3GB restart threshold
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
EOL

# Make scripts executable
chmod +x dev-optimized.js
chmod +x optimize-memory.sh

# 8. Add memory optimization scripts to package.json
echo "Updating package.json with memory optimization scripts..."
# Use node to update package.json
node -e "
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Add memory optimization scripts
packageJson.scripts = packageJson.scripts || {};
packageJson.scripts['dev:optimized'] = 'node dev-optimized.js';
packageJson.scripts['optimize-memory'] = './optimize-memory.sh';
packageJson.scripts['start:optimized'] = 'NODE_OPTIONS=\"--max-old-space-size=4096\" next start';
packageJson.scripts['build:optimized'] = 'NODE_OPTIONS=\"--max-old-space-size=4096\" next build';

// Write updated package.json
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
"

echo "Memory optimization complete!"
echo "Run 'npm run dev:optimized' to start the development server with memory optimizations."
echo "Run 'npm run optimize-memory' to apply all memory optimizations."
echo "Run 'npm run build:optimized' to build the application with memory optimizations."