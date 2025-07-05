import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';

/**
 * Proxy API route for /api/transactions to handle CORS and authentication
 * This provides mock transaction data instead of connecting to the Django backend
 */
export async function GET(request) {
  const requestId = Math.random().toString(36).substring(2, 15);
  logger.debug('[ProxyAPI] Handling transactions proxy request', { requestId });

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
    
    // Generate mock transactions based on tenant ID
    const mockTransactions = [
      {
        id: 1,
        date: new Date(Date.now() - (86400000 * 1)).toISOString(),
        description: 'Sales revenue',
        amount: 1250.00,
        type: 'income',
        category: 'sales',
        account_id: 1,
        account_name: 'Business Checking',
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        date: new Date(Date.now() - (86400000 * 2)).toISOString(),
        description: 'Office supplies',
        amount: -125.67,
        type: 'expense',
        category: 'supplies',
        account_id: 1,
        account_name: 'Business Checking',
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        date: new Date(Date.now() - (86400000 * 3)).toISOString(),
        description: 'Client payment',
        amount: 3500.00,
        type: 'income',
        category: 'services',
        account_id: 1,
        account_name: 'Business Checking',
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      },
      {
        id: 4,
        date: new Date(Date.now() - (86400000 * 4)).toISOString(),
        description: 'Rent payment',
        amount: -2000.00,
        type: 'expense',
        category: 'rent',
        account_id: 1,
        account_name: 'Business Checking',
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      },
      {
        id: 5,
        date: new Date(Date.now() - (86400000 * 5)).toISOString(),
        description: 'Transfer to savings',
        amount: -1000.00,
        type: 'transfer',
        category: 'transfer',
        account_id: 1,
        account_name: 'Business Checking',
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      }
    ];
    
    logger.debug('[ProxyAPI] Returning mock transactions', { 
      requestId,
      tenantId,
      count: mockTransactions.length
    });
      
    return NextResponse.json(mockTransactions);
    
  } catch (error) {
    logger.error('[ProxyAPI] Transactions proxy error', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    
    // Return empty array to avoid breaking the frontend
    return NextResponse.json([]);
  }
} 