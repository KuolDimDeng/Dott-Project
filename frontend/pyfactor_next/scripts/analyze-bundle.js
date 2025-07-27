#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Industry-standard approach to identify optimization opportunities
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Starting bundle analysis...\n');

// Install bundle analyzer if not present
try {
  require.resolve('@next/bundle-analyzer');
} catch (e) {
  console.log('📦 Installing @next/bundle-analyzer...');
  execSync('pnpm add -D @next/bundle-analyzer', { stdio: 'inherit' });
}

// Create temporary config with analyzer enabled
const configContent = `
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: true,
  openAnalyzer: false,
});

const baseConfig = require('./next.config.js');

module.exports = withBundleAnalyzer(baseConfig);
`;

fs.writeFileSync('next.config.analyzer.js', configContent);

console.log('🏗️  Building with bundle analysis...\n');

try {
  // Run build with analyzer
  execSync('ANALYZE=true pnpm next build -c next.config.analyzer.js', { 
    stdio: 'inherit',
    env: { ...process.env, ANALYZE: 'true' }
  });
  
  console.log('\n✅ Bundle analysis complete!');
  console.log('📊 Check the generated reports:');
  console.log('   - Client bundles: .next/analyze/client.html');
  console.log('   - Server bundles: .next/analyze/server.html');
  
  // Get bundle sizes
  const statsPath = '.next/build-manifest.json';
  if (fs.existsSync(statsPath)) {
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    console.log('\n📈 Bundle Statistics:');
    
    // Analyze common chunks
    const pages = stats.pages || {};
    const sizes = {};
    
    Object.entries(pages).forEach(([page, assets]) => {
      const totalSize = assets.reduce((sum, asset) => {
        const filePath = path.join('.next', asset);
        if (fs.existsSync(filePath)) {
          return sum + fs.statSync(filePath).size;
        }
        return sum;
      }, 0);
      sizes[page] = totalSize;
    });
    
    // Sort by size
    const sorted = Object.entries(sizes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    console.log('\n🔝 Top 10 Largest Pages:');
    sorted.forEach(([page, size]) => {
      console.log(`   ${page}: ${(size / 1024).toFixed(2)} KB`);
    });
  }
  
} catch (error) {
  console.error('❌ Analysis failed:', error.message);
} finally {
  // Cleanup
  fs.unlinkSync('next.config.analyzer.js');
}

console.log('\n💡 Optimization Tips:');
console.log('1. Look for duplicate dependencies across chunks');
console.log('2. Identify large libraries that could be dynamically imported');
console.log('3. Check for unused exports in your bundles');
console.log('4. Consider replacing heavy libraries with lighter alternatives');