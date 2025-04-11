import { NextResponse } from 'next/server';

// Mock endpoint for tenant validation
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');
    
    // Return success response with tenant info
    return NextResponse.json({
      success: true,
      tenant: {
        id: tenantId,
        name: `Tenant ${tenantId?.substring(0, 8)}`,
        description: 'Mock tenant for development',
        isActive: true
      }
    });
  } catch (error) {
    console.error('Error in tenant API:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// Handle POST requests to validate tenant
export async function POST(request) {
  try {
    const body = await request.json();
    const { tenantId } = body;
    
    // Always return success for testing
    return NextResponse.json({
      success: true,
      isValid: true,
      tenant: {
        id: tenantId,
        name: `Tenant ${tenantId?.substring(0, 8)}`,
        description: 'Mock tenant for validation',
        isActive: true
      }
    });
  } catch (error) {
    console.error('Error in tenant validation API:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}