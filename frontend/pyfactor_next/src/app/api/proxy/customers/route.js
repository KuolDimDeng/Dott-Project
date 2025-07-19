import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';
import { cookies } from 'next/headers';
import { decrypt } from '@/utils/sessionEncryption';

/**
 * Proxy API route for /api/customers to handle CORS and authentication
 * This provides mock customer data instead of connecting to the Django backend
 */
export async function GET(request) {
  const requestId = Math.random().toString(36).substring(2, 15);
  logger.debug('[ProxyAPI] Handling customers proxy request', { requestId });

  try {
    // Get tenant ID from request parameters
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get('tenant_id');
    
    // Extract the authorization header for Cognito token
    const authHeader = request.headers.get('authorization');
    
    // Get tenant ID from Cognito session if available
    let tenantIdFromCognito = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const cookieStore = cookies();
        const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
        let session = null;
        if (sessionCookie) {
          try {
            const decrypted = decrypt(sessionCookie.value);
            session = JSON.parse(decrypted);
          } catch (e) {
            logger.warn('[ProxyAPI] Failed to decrypt session cookie');
          }
        }
        if (session?.user?.tenantId) {
          tenantIdFromCognito = session.user.tenantId;
          logger.debug('[ProxyAPI] Retrieved tenant ID from Cognito session', { 
            tenantId: tenantIdFromCognito 
          });
        }
      } catch (authError) {
        logger.error('[ProxyAPI] Failed to get tenant ID from Cognito', { error: authError.message });
      }
    }
    
    // Use the tenant ID from parameter or Cognito session, fall back to default
    const tenantId = tenantIdParam || tenantIdFromCognito || '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    
    // Generate mock customers based on tenant ID
    const mockCustomers = [
      {
        id: 1,
        customer_name: 'Acme Corporation',
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@acme.com',
        phone: '555-123-4567',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        postcode: '90210',
        country: 'USA',
        account_number: 'ACME001',
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        customer_name: 'Globex Industries',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@globex.com',
        phone: '555-987-6543',
        street: '456 Oak Ave',
        city: 'Somewhere',
        state: 'NY',
        postcode: '10001',
        country: 'USA',
        account_number: 'GLOBEX002',
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        customer_name: 'Soylent Corp',
        first_name: 'David',
        last_name: 'Johnson',
        email: 'david.johnson@soylent.com',
        phone: '555-456-7890',
        street: '789 Pine St',
        city: 'Otherplace',
        state: 'TX',
        postcode: '75001',
        country: 'USA',
        account_number: 'SOYLENT003',
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      }
    ];
    
    logger.debug('[ProxyAPI] Returning mock customers', { 
      requestId,
      tenantId,
      count: mockCustomers.length
    });
      
    return NextResponse.json(mockCustomers);
    
  } catch (error) {
    logger.error('[ProxyAPI] Customers proxy error', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    
    // Return empty array to avoid breaking the frontend
    return NextResponse.json([]);
  }
} 