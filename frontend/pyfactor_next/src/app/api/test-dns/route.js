import { NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);
const resolveCname = promisify(dns.resolveCname);

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'not set',
      BACKEND_API_URL: process.env.BACKEND_API_URL || 'not set',
      NODE_ENV: process.env.NODE_ENV,
      defaultApiUrl: 'https://api.dottapps.com'
    },
    dnsTests: {},
    connectivityTests: {}
  };

  // Test DNS resolution
  const domains = [
    'api.dottapps.com',
    'api.dottapps.com',
    'dottapps.com'
  ];

  for (const domain of domains) {
    try {
      const ips = await resolve4(domain);
      results.dnsTests[domain] = {
        success: true,
        ips: ips,
        isCloudflareIP: ips.some(ip => ip.startsWith('216.24.') || ip.startsWith('172.67.'))
      };
    } catch (error) {
      results.dnsTests[domain] = {
        success: false,
        error: error.message
      };
    }

    // Try CNAME resolution
    try {
      const cnames = await resolveCname(domain);
      results.dnsTests[domain].cnames = cnames;
    } catch (error) {
      // Domain might not have CNAME records
      results.dnsTests[domain].cnames = null;
    }
  }

  // Test actual connectivity
  const endpoints = [
    { name: 'api.dottapps.com/health', url: 'https://api.dottapps.com/health/' },
    { name: 'api.dottapps.com/health', url: 'https://api.dottapps.com/health/' },
    { name: 'api.dottapps.com/api/sessions/cloudflare/create', url: 'https://api.dottapps.com/api/sessions/cloudflare/create/' }
  ];

  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Dott-DNS-Test/1.0'
        }
      });
      
      results.connectivityTests[endpoint.name] = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        responseTime: Date.now() - startTime,
        headers: {
          'cf-ray': response.headers.get('cf-ray'),
          'server': response.headers.get('server'),
          'x-render-origin-server': response.headers.get('x-render-origin-server')
        }
      };
    } catch (error) {
      results.connectivityTests[endpoint.name] = {
        success: false,
        error: error.message,
        errorType: error.constructor.name
      };
    }
  }

  // Add recommendations
  results.recommendations = [];
  
  if (results.dnsTests['api.dottapps.com']?.isCloudflareIP) {
    results.recommendations.push('api.dottapps.com is resolving to Cloudflare IPs, which may cause Error 1000');
  }
  
  if (!process.env.NEXT_PUBLIC_API_URL) {
    results.recommendations.push('NEXT_PUBLIC_API_URL environment variable is not set, using default');
  }

  const hasConnectivityIssues = Object.values(results.connectivityTests).some(test => !test.success);
  if (hasConnectivityIssues) {
    results.recommendations.push('Some endpoints are not accessible, check the connectivity test results');
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}