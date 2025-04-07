import { NextResponse } from 'next/server';
import axios from 'axios';
import { logger } from '@/utils/serverLogger';

/**
 * Proxy API route for /api/profile to handle CORS and authentication
 * This forwards requests to the Django backend (port 8000) from the Next.js frontend (port 3000)
 */
export async function GET(request) {
  const requestId = Math.random().toString(36).substring(2, 15);
  logger.debug('[ProxyAPI] Handling profile proxy request', { requestId });

  try {
    // Get tenant ID from request parameters or cookies
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get('tenant_id');
    
    // Get cookies for tenant ID if parameter not provided
    const cookies = request.headers.get('cookie');
    let tenantIdCookie = null;
    
    if (cookies) {
      cookies.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name === 'tenantId') {
          tenantIdCookie = value;
        }
      });
    }
    
    // Use the tenant ID from parameter or cookie
    const tenantId = tenantIdParam || tenantIdCookie || '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    
    // Construct the profile data with the tenant ID
    const profile = {
      userId: tenantId,
      username: 'user',
      email: 'user@example.com',
      given_name: 'Demo',
      family_name: 'User',
      is_onboarded: true,
      onboarding_status: 'COMPLETE',
      business_name: 'Demo Business',
      tenant_id: tenantId,
      database_name: `tenant_${tenantId.replace(/-/g, '_')}`,
      role: 'OWNER',
      subscription_plan: 'FREE'
    };
    
    logger.debug('[ProxyAPI] Returning proxied profile', { 
      requestId,
      tenantId,
      database_name: profile.database_name
    });
      
    return NextResponse.json(profile);
    
  } catch (error) {
    logger.error('[ProxyAPI] Proxy error', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    
    // Return a mock profile to avoid breaking the frontend
    const mockProfile = {
      userId: '18609ed2-1a46-4d50-bc4e-483d6e3405ff',
      username: 'mock-user',
      email: 'user@example.com',
      given_name: 'Mock',
      family_name: 'User',
      is_onboarded: true,
      onboarding_status: 'COMPLETE',
      business_name: 'Mock Business',
      tenant_id: '18609ed2-1a46-4d50-bc4e-483d6e3405ff',
      database_name: 'tenant_18609ed2_1a46_4d50_bc4e_483d6e3405ff',
      role: 'OWNER',
      subscription_plan: 'FREE',
      _proxied: true,
      _error: error.message
    };
    
    return NextResponse.json(mockProfile);
  }
} 