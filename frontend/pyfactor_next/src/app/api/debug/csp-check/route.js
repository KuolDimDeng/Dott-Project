import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request) {
  try {
    const requestHeaders = headers();
    const headersList = {};
    
    // Collect all headers
    requestHeaders.forEach((value, key) => {
      headersList[key] = value;
    });
    
    // Get specific security headers
    const cspHeader = requestHeaders.get('content-security-policy');
    const xFrameOptions = requestHeaders.get('x-frame-options');
    const strictTransport = requestHeaders.get('strict-transport-security');
    
    // Check next.config.js content
    const nextConfigPath = process.cwd() + '/next.config.js';
    let nextConfigContent = 'Unable to read';
    let cspInConfig = false;
    
    try {
      const fs = require('fs');
      nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');
      
      // Check if CSP includes required domains
      cspInConfig = nextConfigContent.includes('cloudflare.com') && 
                    nextConfigContent.includes('ingest.sentry.io') &&
                    nextConfigContent.includes('ingest.us.sentry.io');
    } catch (readError) {
      nextConfigContent = `Error reading: ${readError.message}`;
    }
    
    // Check environment
    const environment = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      BACKEND_API_URL: process.env.BACKEND_API_URL,
      DEPLOYMENT_PLATFORM: process.env.DEPLOYMENT_PLATFORM || 'unknown',
      BUILD_TIME: process.env.BUILD_TIME || new Date().toISOString()
    };
    
    // Test backend connectivity
    let backendStatus = 'Unknown';
    let backendError = null;
    
    try {
      const backendUrl = process.env.BACKEND_API_URL || 'https://api.dottapps.com';
      const response = await fetch(`${backendUrl}/health/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (response.ok) {
        backendStatus = 'Connected';
        const data = await response.json();
        backendStatus = `Connected (${data.status || 'ok'})`;
      } else {
        backendStatus = `Error: ${response.status} ${response.statusText}`;
      }
    } catch (error) {
      backendStatus = 'Failed';
      backendError = error.message;
    }
    
    // Parse CSP if present
    let cspAnalysis = null;
    if (cspHeader) {
      const directives = cspHeader.split(';').map(d => d.trim());
      const connectSrc = directives.find(d => d.startsWith('connect-src'));
      
      cspAnalysis = {
        hasCloudflare: cspHeader.includes('cloudflare.com'),
        hasSentry: cspHeader.includes('sentry.io'),
        hasIngestSentry: cspHeader.includes('ingest.sentry.io'),
        hasIngestUsSentry: cspHeader.includes('ingest.us.sentry.io'),
        connectSrcDirective: connectSrc || 'Not found',
        fullCSP: cspHeader.substring(0, 500) + (cspHeader.length > 500 ? '...' : '')
      };
    }
    
    // Get request info
    const requestInfo = {
      url: request.url,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      cfRay: request.headers.get('cf-ray'),
      cfConnectingIP: request.headers.get('cf-connecting-ip'),
      xForwardedFor: request.headers.get('x-forwarded-for'),
      xRealIP: request.headers.get('x-real-ip')
    };
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment,
      headers: {
        all: headersList,
        security: {
          'content-security-policy': cspHeader || 'Not set',
          'x-frame-options': xFrameOptions || 'Not set',
          'strict-transport-security': strictTransport || 'Not set'
        }
      },
      cspAnalysis,
      nextConfig: {
        hasCSPInConfig: cspInConfig,
        configPreview: nextConfigContent.substring(0, 1000) + '...'
      },
      backend: {
        status: backendStatus,
        error: backendError
      },
      request: requestInfo,
      deployment: {
        platform: process.env.DEPLOYMENT_PLATFORM || 'render',
        region: process.env.RENDER_REGION || process.env.VERCEL_REGION || 'unknown',
        gitCommit: process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
      }
    };
    
    return NextResponse.json(debugInfo, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Debug-Timestamp': new Date().toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug check failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}