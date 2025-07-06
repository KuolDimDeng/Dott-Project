import { NextResponse } from 'next/server';

/**
 * Comprehensive Cloudflare flow and DNS test
 */
export async function GET(request) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {
      environment: {},
      dns: {},
      backend: {},
      auth: {},
      session: {},
      cloudflare: {}
    },
    recommendations: []
  };

  // 1. Environment Check
  results.tests.environment = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    BACKEND_API_URL: process.env.BACKEND_API_URL,
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    isProduction: process.env.NODE_ENV === 'production',
    isRender: !!process.env.RENDER
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

  // 2. DNS Resolution Test
  try {
    const apiHostname = new URL(API_URL).hostname;
    
    // Try to get DNS info using a public DNS service
    const dnsResponse = await fetch(`https://dns.google/resolve?name=${apiHostname}&type=A`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (dnsResponse.ok) {
      const dnsData = await dnsResponse.json();
      results.tests.dns = {
        hostname: apiHostname,
        resolved: true,
        answers: dnsData.Answer || [],
        status: dnsData.Status,
        isCloudflareIP: dnsData.Answer?.some(a => 
          a.data?.startsWith('104.') || 
          a.data?.startsWith('172.') || 
          a.data?.startsWith('173.')
        )
      };
      
      if (results.tests.dns.isCloudflareIP) {
        results.recommendations.push("✅ DNS is pointing to Cloudflare (good)");
      }
    }
  } catch (error) {
    results.tests.dns = {
      error: error.message,
      note: "DNS test failed - this is normal in some environments"
    };
  }

  // 3. Backend Health Check
  try {
    console.log('[CloudflareFlowTest] Testing backend health:', `${API_URL}/health/`);
    
    const healthResponse = await fetch(`${API_URL}/health/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Dott-Frontend-FlowTest',
        'Cache-Control': 'no-cache'
      }
    });
    
    const responseHeaders = Object.fromEntries(healthResponse.headers.entries());
    const responseText = await healthResponse.text();
    
    let healthData;
    try {
      healthData = JSON.parse(responseText);
    } catch {
      healthData = { raw: responseText.substring(0, 500) };
    }
    
    results.tests.backend = {
      url: `${API_URL}/health/`,
      reachable: healthResponse.ok,
      status: healthResponse.status,
      data: healthData,
      headers: responseHeaders,
      isCloudflareResponse: !!responseHeaders['cf-ray'],
      cfRay: responseHeaders['cf-ray'],
      server: responseHeaders['server'],
      isCloudflareError: responseText.includes('Cloudflare') && responseText.includes('Error 1000'),
      isDNSError: responseText.includes('DNS points to prohibited IP')
    };
    
    // Check for Cloudflare Error 1000
    if (results.tests.backend.isCloudflareError || results.tests.backend.isDNSError) {
      results.recommendations.push("❌ Cloudflare Error 1000 detected - DNS is pointing to a prohibited IP");
      results.recommendations.push("🔧 FIX: Update api.dottapps.com DNS to point to your Cloudflare Tunnel, not directly to Render");
    } else if (results.tests.backend.reachable) {
      results.recommendations.push("✅ Backend is reachable");
    }
    
    // Check if response came through Cloudflare
    if (results.tests.backend.cfRay) {
      results.recommendations.push("✅ Request went through Cloudflare proxy");
    }
    
  } catch (error) {
    results.tests.backend = {
      reachable: false,
      error: error.message,
      type: error.constructor.name,
      suggestion: "Backend is not reachable - check DNS and tunnel configuration"
    };
    results.recommendations.push("❌ Backend health check failed");
  }

  // 4. Auth0 Test
  try {
    const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-cbyy63jovi6zrcos.us.auth0.com';
    const auth0Response = await fetch(`https://${auth0Domain}/.well-known/openid-configuration`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (auth0Response.ok) {
      const auth0Config = await auth0Response.json();
      results.tests.auth = {
        reachable: true,
        issuer: auth0Config.issuer,
        tokenEndpoint: auth0Config.token_endpoint,
        configured: true
      };
      results.recommendations.push("✅ Auth0 is properly configured");
    }
  } catch (error) {
    results.tests.auth = {
      reachable: false,
      error: error.message
    };
    results.recommendations.push("⚠️ Auth0 configuration check failed");
  }

  // 5. Session Endpoint Test
  try {
    const sessionUrl = `${API_URL}/api/sessions/cloudflare/create/`;
    const sessionResponse = await fetch(sessionUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://dottapps.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    
    const sessionHeaders = Object.fromEntries(sessionResponse.headers.entries());
    
    results.tests.session = {
      url: sessionUrl,
      optionsSuccess: sessionResponse.ok || sessionResponse.status === 204,
      status: sessionResponse.status,
      corsHeaders: {
        allowOrigin: sessionHeaders['access-control-allow-origin'],
        allowMethods: sessionHeaders['access-control-allow-methods'],
        allowHeaders: sessionHeaders['access-control-allow-headers'],
        allowCredentials: sessionHeaders['access-control-allow-credentials']
      },
      cfRay: sessionHeaders['cf-ray']
    };
    
    if (results.tests.session.optionsSuccess) {
      results.recommendations.push("✅ Session endpoint CORS is properly configured");
    } else {
      results.recommendations.push("⚠️ Session endpoint CORS may need configuration");
    }
    
  } catch (error) {
    results.tests.session = {
      error: error.message,
      type: error.constructor.name
    };
    results.recommendations.push("❌ Session endpoint test failed");
  }

  // 6. Cloudflare Tunnel Status (inferred from responses)
  results.tests.cloudflare = {
    tunnelLikely: false,
    indicators: []
  };

  // Check if responses indicate tunnel usage
  if (results.tests.backend.cfRay && !results.tests.backend.isDNSError) {
    if (results.tests.backend.server !== 'cloudflare') {
      results.tests.cloudflare.tunnelLikely = true;
      results.tests.cloudflare.indicators.push("Backend server header is not 'cloudflare' (indicates tunnel)");
    }
  }

  // Summary and main recommendations
  if (results.tests.backend.isDNSError || results.tests.backend.isCloudflareError) {
    results.recommendations.unshift("🚨 CRITICAL: Cloudflare Tunnel is NOT being used!");
    results.recommendations.unshift("🔧 ACTION REQUIRED: Update DNS record for api.dottapps.com");
    results.recommendations.unshift("📋 STEPS:");
    results.recommendations.unshift("1. Go to Cloudflare Dashboard > DNS");
    results.recommendations.unshift("2. Find the 'api' CNAME record");
    results.recommendations.unshift("3. Change it from 'dott-api.onrender.com' to your tunnel hostname");
    results.recommendations.unshift("4. Ensure proxy status is ON (orange cloud)");
  } else if (results.tests.cloudflare.tunnelLikely) {
    results.recommendations.unshift("✅ Cloudflare Tunnel appears to be working correctly!");
  }

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Content-Type': 'application/json'
    },
    status: 200
  });
}