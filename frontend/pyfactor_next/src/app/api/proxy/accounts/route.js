import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';

/**
 * Proxy API route for /api/accounts to handle CORS and authentication
 * This provides mock account data instead of connecting to the Django backend
 */
export async function GET(request) {
  const requestId = Math.random().toString(36).substring(2, 15);
  logger.debug('[ProxyAPI] Handling accounts proxy request', { requestId });

  try {
    // Get tenant ID from request parameters or cookies
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get('tenant_id');
    const database = searchParams.get('database');
    
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
    
    // Generate mock accounts based on tenant ID
    const mockAccounts = [
      {
        id: 1,
        name: 'Business Checking',
        type: 'bank',
        currency: 'USD',
        balance: 25000.00,
        account_number: '****1234',
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Business Savings',
        type: 'bank',
        currency: 'USD',
        balance: 50000.00,
        account_number: '****5678',
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Business Credit Card',
        type: 'credit',
        currency: 'USD',
        balance: -2500.00,
        account_number: '****9012',
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      }
    ];
    
    logger.debug('[ProxyAPI] Returning mock accounts', { 
      requestId,
      tenantId,
      count: mockAccounts.length
    });
      
    return NextResponse.json(mockAccounts);
    
  } catch (error) {
    logger.error('[ProxyAPI] Accounts proxy error', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    
    // Return empty array to avoid breaking the frontend
    return NextResponse.json([]);
  }
} 