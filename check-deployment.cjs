#!/usr/bin/env node

const https = require('https');

const FRONTEND_URL = 'https://dottapps.com';
const BACKEND_URL = 'https://api.dottapps.com';

console.log('🔍 Checking deployment status...\n');

function checkUrl(url, name) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const isSecurityCheckpoint = data.includes('Vercel Security Checkpoint');
        const status = res.statusCode;
        
        console.log(`${name}:`);
        console.log(`  Status: ${status}`);
        console.log(`  Security Checkpoint: ${isSecurityCheckpoint ? '⏳ Yes (still deploying)' : '✅ No (ready)'}`);
        
        if (name === 'Backend' && status === 200) {
          console.log(`  Response: ${data.trim()}`);
        }
        
        resolve({ status, isSecurityCheckpoint, ready: !isSecurityCheckpoint && status === 200 });
      });
    });
    
    req.on('error', (err) => {
      console.log(`${name}: ❌ Error - ${err.message}`);
      resolve({ status: 0, isSecurityCheckpoint: false, ready: false });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      console.log(`${name}: ⏱️ Timeout`);
      resolve({ status: 0, isSecurityCheckpoint: false, ready: false });
    });
  });
}

async function main() {
  const [frontend, backend] = await Promise.all([
    checkUrl(FRONTEND_URL, 'Frontend'),
    checkUrl(`${BACKEND_URL}/health/`, 'Backend')
  ]);
  
  console.log('\n📋 Summary:');
  console.log(`Frontend: ${frontend.ready ? '✅ Ready' : frontend.isSecurityCheckpoint ? '⏳ Deploying' : '❌ Not ready'}`);
  console.log(`Backend: ${backend.ready ? '✅ Ready' : '❌ Not ready'}`);
  
  if (frontend.ready && backend.ready) {
    console.log('\n🎉 Both frontend and backend are ready!');
    console.log(`Visit: ${FRONTEND_URL}`);
  } else if (frontend.isSecurityCheckpoint) {
    console.log('\n⏳ Frontend is still deploying. Wait 1-2 minutes and try again.');
  } else {
    console.log('\n❌ Issues detected. Check configurations.');
  }
}

main(); 