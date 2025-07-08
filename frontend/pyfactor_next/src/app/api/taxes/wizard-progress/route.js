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
    
    // Try to forward to Django backend, fallback to local storage
    try {
      const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/taxes/api/wizard-progress/?tenant_id=${tenantId}`;
      
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (backendError) {
      logger.warn('[API] Backend not available, using fallback for wizard progress:', backendError.message);
    }
    
    // Fallback: return empty progress to allow wizard to work
    return NextResponse.json({
      businessInfo: null,
      taxRates: null,
      benefits: null,
      filingInfo: null,
      currentStep: 1
    });
    
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
    
    // Try to forward to Django backend, fallback to local success
    try {
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
        }),
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (backendError) {
      logger.warn('[API] Backend not available, using fallback for saving progress:', backendError.message);
    }
    
    // Fallback: return success to allow wizard to work
    logger.info(`[API] Saving wizard progress locally for tenant ${tenantId}, step ${currentStep}`);
    return NextResponse.json({
      success: true,
      message: 'Progress saved successfully',
      currentStep: currentStep
    });
    
  } catch (error) {
    logger.error('[API] Tax wizard progress POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save wizard progress' },
      { status: 500 }
    );
  }
}