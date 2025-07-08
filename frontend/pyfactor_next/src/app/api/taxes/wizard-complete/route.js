import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    const body = await request.json();
    const { tenantId, businessInfo, taxRates, benefits, filingInfo, suggestions } = body;
    
    if (!tenantId || !businessInfo || !taxRates) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Combine all data into final tax settings
    const taxSettings = {
      businessInfo,
      taxRates: {
        ...taxRates,
        ...benefits,
        ...filingInfo
      },
      metadata: {
        completedAt: new Date().toISOString(),
        suggestions: suggestions || {},
        wizardVersion: '1.0'
      }
    };
    
    // Save to backend
    const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/taxes/api/verify/`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        tenantId,
        businessInfo,
        taxRates: taxSettings.taxRates,
        signature: 'Completed via wizard',
        agreedAt: new Date().toISOString(),
        suggestions: taxSettings.metadata.suggestions
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      logger.error('[API] Tax wizard complete error:', errorData);
      throw new Error(`Backend responded with ${response.status}`);
    }
    
    const data = await response.json();
    
    // Clear wizard progress after successful completion
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/taxes/api/wizard-progress/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ tenant_id: tenantId })
      });
    } catch (clearError) {
      logger.warn('[API] Failed to clear wizard progress:', clearError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Tax settings saved successfully',
      taxSettings
    });
    
  } catch (error) {
    logger.error('[API] Tax wizard complete error:', error);
    return NextResponse.json(
      { error: 'Failed to complete tax wizard' },
      { status: 500 }
    );
  }
}