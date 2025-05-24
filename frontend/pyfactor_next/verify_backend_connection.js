#!/usr/bin/env node

/**
 * Backend Connection Verification Script
 * Generated: 2025-05-24T00:10:29.073Z
 * Backend URL: https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com
 */

import fetch from 'node-fetch';

const BACKEND_URL = 'https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com';

async function verifyBackendConnection() {
    console.log('🔍 Verifying backend connection...');
    console.log('Backend URL:', BACKEND_URL);
    
    try {
        // Test basic connectivity
        const response = await fetch(`${BACKEND_URL}/health/`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
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
        return false;
    }
}

async function main() {
    const isConnected = await verifyBackendConnection();
    
    if (isConnected) {
        console.log('\n🎉 Backend connection verified successfully!');
        console.log('✅ Frontend is ready for production deployment');
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
