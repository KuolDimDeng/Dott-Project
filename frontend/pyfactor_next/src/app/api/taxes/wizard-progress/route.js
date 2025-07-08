import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

// GET - Load saved wizard progress
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }
    
    // Forward to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/taxes/api/wizard-progress/?tenant_id=${tenantId}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        // No saved progress, return empty
        return NextResponse.json({
          businessInfo: null,
          taxRates: null,
          benefits: null,
          filingInfo: null,
          currentStep: 1
        });
      }
      throw new Error(`Backend responded with ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error('[API] Tax wizard progress GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load wizard progress' },
      { status: 500 }
    );
  }
}

// POST - Save wizard progress
export async function POST(request) {
  try {
    const body = await request.json();
    const { tenantId, currentStep, businessInfo, taxRates, benefits, filingInfo } = body;
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }
    
    // Forward to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/taxes/api/wizard-progress/`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        current_step: currentStep,
        business_info: businessInfo,
        tax_rates: taxRates,
        benefits: benefits,
        filing_info: filingInfo
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      logger.error('[API] Tax wizard progress save error:', errorData);
      throw new Error(`Backend responded with ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error('[API] Tax wizard progress POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save wizard progress' },
      { status: 500 }
    );
  }
}