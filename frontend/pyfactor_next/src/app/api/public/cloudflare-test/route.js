import { NextResponse } from 'next/server';

/**
 * Public endpoint to test Cloudflare and DNS configuration
 * No authentication required
 */
export async function GET(request) {
  const results = {
    timestamp: new Date().toISOString(),
    status: 'CLOUDFLARE_DNS_TEST',
    tests: {},
    diagnosis: {},
    recommendations: []
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

  // Test 1: Check DNS Resolution
  try {
    const apiHostname = new URL(API_URL).hostname;
    const dnsResponse = await fetch(`https://1.1.1.1/dns-query?name=${apiHostname}`, {
      headers: { 
        'Accept': 'application/dns-json'
      }
    });
    
    if (dnsResponse.ok) {
      const dnsData = await dnsResponse.json();
      results.tests.dns = {
        hostname: apiHostname,
        status: dnsData.Status === 0 ? 'OK' : 'ERROR',
        answers: dnsData.Answer || []
      };
    }
  } catch (error) {
    results.tests.dns = { error: error.message };
  }

  // Test 2: Backend Health Check
  try {
    const healthResponse = await fetch(`${API_URL}/health/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      // Short timeout to avoid hanging
      signal: AbortSignal.timeout(5000)
    });
    
    const responseText = await healthResponse.text();
    const headers = Object.fromEntries(healthResponse.headers.entries());
    
    results.tests.backend = {
      url: `${API_URL}/health/`,
      status: healthResponse.status,
      cfRay: headers['cf-ray'],
      server: headers['server'],
      contentType: headers['content-type']
    };
    
    // Check for Cloudflare Error 1000
    if (responseText.includes('Error 1000') || responseText.includes('DNS points to prohibited IP')) {
      results.diagnosis = {
        issue: 'CLOUDFLARE_ERROR_1000',
        message: 'DNS is pointing to a prohibited IP (Cloudflare to Cloudflare)',
        currentSetup: 'api.dottapps.com → api.dottapps.com → Cloudflare Error',
        requiredSetup: 'api.dottapps.com → [tunnel-id].cfargotunnel.com → Your Backend'
      };
      
      results.recommendations = [
        '🚨 URGENT: Update DNS Configuration',
        '1. Go to Cloudflare Dashboard > DNS',
        '2. Find the "api" CNAME record',
        '3. Change target from "api.dottapps.com" to your tunnel hostname',
        '4. The tunnel hostname format is: [tunnel-id].cfargotunnel.com',
        '5. To find it: Zero Trust > Access > Tunnels > dott-backend-tunnel'
      ];
    } else if (healthResponse.ok) {
      try {
        const healthData = JSON.parse(responseText);
        results.tests.backend.data = healthData;
        results.diagnosis.status = 'BACKEND_REACHABLE';
      } catch {
        results.tests.backend.rawResponse = responseText.substring(0, 200);
      }
    }
    
  } catch (error) {
    results.tests.backend = {
      error: error.message,
      type: error.name
    };
    
    if (error.name === 'AbortError') {
      results.diagnosis.issue = 'TIMEOUT';
      results.diagnosis.message = 'Backend request timed out';
    }
  }

  // Test 3: Check Tunnel Status (by checking if we can reach a tunnel-specific endpoint)
  results.tests.tunnel = {
    configured: !!process.env.CLOUDFLARE_TUNNEL_TOKEN,
    dnsPointsToTunnel: false
  };

  // Add environment info
  results.environment = {
    apiUrl: API_URL,
    nodeEnv: process.env.NODE_ENV,
    deployment: process.env.RENDER_SERVICE_NAME || 'unknown'
  };

  // Final diagnosis
  if (!results.diagnosis.issue && !results.diagnosis.status) {
    results.diagnosis = {
      issue: 'UNKNOWN',
      message: 'Could not determine the exact issue'
    };
  }

  return NextResponse.json(results, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    }
  });
}