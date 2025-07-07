import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateTenantAccess } from '@/utils/auth.server';

export async function DELETE(request, { params }) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { vendorId } = params;
    
    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }
    
    // Call backend delete endpoint
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/purchases/api/vendors/${vendorId}/delete/`;
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': request.headers.get('Authorization'),
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to delete vendor' },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error) {
    logger.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { vendorId } = params;
    const { action } = await request.json();
    
    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }
    
    if (action !== 'toggle-status') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
    
    // Call backend toggle status endpoint
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/purchases/api/vendors/${vendorId}/toggle-status/`;
    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': request.headers.get('Authorization'),
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to update vendor status' },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error) {
    logger.error('Error updating vendor status:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor status' },
      { status: 500 }
    );
  }
}