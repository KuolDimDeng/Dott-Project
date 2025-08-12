#!/usr/bin/env node

/**
 * DNS Cache Test Script
 * Tests DNS resolution and provides cache clearing instructions
 */

import { promises as dns } from 'dns';
import https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';
const execPromise = promisify(exec);

const API_DOMAIN = 'api.dottapps.com';
const API_URL = `https://${API_DOMAIN}`;

async function testDNS() {
  console.log('🔍 DNS Resolution Test for:', API_DOMAIN);
  console.log('=====================================\n');
  
  // 1. DNS Lookup
  console.log('1. DNS Lookup Test:');
  try {
    const addresses = await dns.resolve4(API_DOMAIN);
    console.log('✅ DNS Resolution successful:');
    console.log('   IPv4 addresses:', addresses);
    
    // Also try CNAME
    try {
      const cname = await dns.resolveCname(API_DOMAIN);
      console.log('   CNAME:', cname);
    } catch (e) {
      // CNAME might not exist, that's ok
    }
  } catch (error) {
    console.log('❌ DNS Resolution failed:', error.message);
  }
  
  console.log('\n2. System DNS Cache Status:');
  
  // Check different systems
  if (process.platform === 'darwin') {
    // macOS
    console.log('📱 macOS DNS Cache:');
    try {
      const { stdout } = await execPromise('dscacheutil -statistics');
      console.log(stdout);
    } catch (e) {
      console.log('   Unable to get cache statistics');
    }
  } else if (process.platform === 'linux') {
    // Linux
    console.log('🐧 Linux DNS:');
    try {
      const { stdout } = await execPromise('systemctl status systemd-resolved');
      console.log(stdout);
    } catch (e) {
      console.log('   systemd-resolved not available');
    }
  }
  
  console.log('\n3. HTTPS Connection Test:');
  try {
    await new Promise((resolve, reject) => {
      https.get(`${API_URL}/health/`, (res) => {
        console.log('✅ HTTPS connection successful:');
        console.log('   Status:', res.statusCode);
        console.log('   Headers:', res.headers);
        res.on('data', () => {});
        res.on('end', resolve);
      }).on('error', reject);
    });
  } catch (error) {
    console.log('❌ HTTPS connection failed:', error.message);
  }
  
  console.log('\n4. Browser Cache Clear Instructions:');
  console.log('=====================================');
  console.log('🌐 Chrome/Edge:');
  console.log('   1. Open: chrome://net-internals/#dns');
  console.log('   2. Click "Clear host cache"');
  console.log('   3. Also visit: chrome://net-internals/#sockets');
  console.log('   4. Click "Flush socket pools"');
  console.log('');
  console.log('🦊 Firefox:');
  console.log('   1. Open: about:networking#dns');
  console.log('   2. Click "Clear DNS Cache"');
  console.log('');
  console.log('🧭 Safari:');
  console.log('   1. Develop menu → Empty Caches');
  console.log('   2. Or use Terminal: sudo dscacheutil -flushcache');
  
  console.log('\n5. System DNS Flush Commands:');
  console.log('=====================================');
  if (process.platform === 'darwin') {
    console.log('🍎 macOS:');
    console.log('   sudo dscacheutil -flushcache');
    console.log('   sudo killall -HUP mDNSResponder');
  } else if (process.platform === 'linux') {
    console.log('🐧 Linux:');
    console.log('   sudo systemctl restart systemd-resolved');
    console.log('   sudo resolvectl flush-caches');
  } else if (process.platform === 'win32') {
    console.log('🪟 Windows:');
    console.log('   ipconfig /flushdns');
  }
  
  console.log('\n6. Alternative Workarounds:');
  console.log('=====================================');
  console.log('1. Use incognito/private browsing mode');
  console.log('2. Try a different browser');
  console.log('3. Restart your browser completely');
  console.log('4. Check if VPN or proxy is interfering');
  console.log('5. Try mobile hotspot (different network)');
  
  console.log('\n7. Quick Test URLs:');
  console.log('=====================================');
  console.log(`Direct health check: ${API_URL}/health/`);
  console.log(`Render URL: https://dott-api-y26w.onrender.com/health/`);
  console.log('Cloudflare trace: https://www.cloudflare.com/cdn-cgi/trace');
}

// Run the test
testDNS().catch(console.error);