import { NextResponse } from 'next/server';
// Removed AWS Cognito server utils - now using Auth0
import { serverLogger } from '@/utils/logger';

/**
 * POST route to set the tenant ID in Cognito
 */
export async function POST(request) {
  try {
    const { tenantId } = await request.json();
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }
    
    // Update tenant ID in Cognito
    const success = await updateTenantIdInCognito(tenantId);
    
    if (!success) {
      serverLogger.error('[tenant/api] Failed to update tenant ID in Cognito');
      return NextResponse.json({ error: 'Failed to set tenant ID' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    serverLogger.error('[tenant/api] Error setting tenant ID:', error.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * GET route to get the current tenant ID from Cognito
 */
export async function GET() {
  try {
    const userAttributes = await getUserAttributesFromCognito();
    // Prioritize the correct attribute name (custom:tenant_ID with uppercase ID)
    const tenantId = userAttributes?.['custom:tenant_ID'] || 
                     userAttributes?.['custom:tenant_id'] || 
                     userAttributes?.['custom:businessid'];
                     
    return NextResponse.json({ tenantId });
  } catch (error) {
    serverLogger.error('[tenant/api] Error getting tenant ID:', error.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 