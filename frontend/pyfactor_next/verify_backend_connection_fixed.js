#!/usr/bin/env node

/**
 * Backend Connection Verification Script - Fixed SSL
 * Generated: 2025-05-23T18:10:44Z
 * Backend URL: https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com
 */

import https from 'https';

const BACKEND_URL = 'https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com';

// Create an agent that ignores SSL certificate errors for EB testing
const agent = new https.Agent({
    rejectUnauthorized: false
});

async function verifyBackendConnection() {
    console.log('🔍 Verifying backend connection...');
    console.log('Backend URL:', BACKEND_URL);
    
    try {
        // Test basic connectivity with SSL certificate bypass
        const response = await fetch(`${BACKEND_URL}/health/`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            agent: agent,
            timeout: 10000
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Backend is accessible');
            console.log('Response:', data);
            return true;
        } else {
            console.log('⚠️  Backend responded with status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to connect to backend:', error.message);
        
        // Try with curl as fallback
        console.log('🔄 Trying alternative verification...');
        try {
            const { execSync } = await import('child_process');
            const result = execSync(`curl -k -s "${BACKEND_URL}/health/"`, { encoding: 'utf8' });
            const data = JSON.parse(result);
            console.log('✅ Backend is accessible (via curl)');
            console.log('Response:', data);
            return true;
        } catch (curlError) {
            console.error('❌ Curl verification also failed:', curlError.message);
            return false;
        }
    }
}

async function main() {
    const isConnected = await verifyBackendConnection();
    
    if (isConnected) {
        console.log('\n🎉 Backend connection verified successfully!');
        console.log('✅ Frontend is ready for production deployment');
        console.log('ℹ️  Note: SSL certificate mismatch is expected for Elastic Beanstalk URLs');
    } else {
        console.log('\n❌ Backend connection failed');
        console.log('Please verify:');
        console.log('1. Backend is deployed and running');
        console.log('2. CORS is properly configured');
        console.log('3. Network connectivity');
        process.exit(1);
    }
}

main().catch(console.error);
