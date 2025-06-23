#!/usr/bin/env node

/**
 * Fast build script for Next.js with optimizations
 * Uses parallel processing and caching for speed
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// Build configuration
const BUILD_CONFIG = {
  maxWorkers: 4,
  memoryLimit: 3072, // MB
  cacheDir: '.next/cache',
  buildCache: '.build-cache'
};

async function cleanBuildArtifacts() {
  console.log('🧹 Cleaning build artifacts...');
  const dirsToClean = ['.next', 'out', '.turbo'];
  
  await Promise.all(
    dirsToClean.map(async (dir) => {
      try {
        await fs.rm(dir, { recursive: true, force: true });
      } catch (err) {
        // Directory doesn't exist, that's fine
      }
    })
  );
}

async function preBuildOptimizations() {
  console.log('⚡ Running pre-build optimizations...');
  
  // Set environment variables for optimal build
  process.env.NODE_ENV = 'production';
  process.env.NEXT_TELEMETRY_DISABLED = '1';
  process.env.NODE_OPTIONS = `--max-old-space-size=${BUILD_CONFIG.memoryLimit}`;
  
  // Create cache directory if it doesn't exist
  try {
    await fs.mkdir(BUILD_CONFIG.cacheDir, { recursive: true });
    await fs.mkdir(BUILD_CONFIG.buildCache, { recursive: true });
  } catch (err) {
    // Directories might already exist
  }
}

async function runBuild() {
  console.log('🚀 Starting optimized build...');
  console.log(`   Memory limit: ${BUILD_CONFIG.memoryLimit}MB`);
  console.log(`   Max workers: ${BUILD_CONFIG.maxWorkers}`);
  
  const startTime = Date.now();
  
  try {
    // Run the build with optimizations
    const buildCommand = [
      'pnpm next build',
      '--experimental-turbo',
      `--experimental-turbo-max-workers=${BUILD_CONFIG.maxWorkers}`,
    ].join(' ');
    
    const { stdout, stderr } = await execAsync(buildCommand, {
      env: {
        ...process.env,
        NEXT_BUILD_WORKERS: BUILD_CONFIG.maxWorkers,
        NODE_OPTIONS: `--max-old-space-size=${BUILD_CONFIG.memoryLimit}`,
      }
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    const buildTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Build completed in ${buildTime}s`);
    
    // Save build metadata
    await fs.writeFile(
      path.join(BUILD_CONFIG.buildCache, 'last-build.json'),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        duration: buildTime,
        config: BUILD_CONFIG
      }, null, 2)
    );
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

async function postBuildOptimizations() {
  console.log('📦 Running post-build optimizations...');
  
  try {
    // Get build size info
    const { stdout } = await execAsync('du -sh .next/standalone');
    console.log(`   Standalone size: ${stdout.trim()}`);
  } catch (err) {
    // Ignore if command fails
  }
}

async function main() {
  console.log('🏗️  Next.js Fast Build Script');
  console.log('============================\n');
  
  // Check if we should clean first
  const shouldClean = process.argv.includes('--clean');
  
  if (shouldClean) {
    await cleanBuildArtifacts();
  }
  
  await preBuildOptimizations();
  await runBuild();
  await postBuildOptimizations();
  
  console.log('\n✨ Build process complete!');
}

// Run the build
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});