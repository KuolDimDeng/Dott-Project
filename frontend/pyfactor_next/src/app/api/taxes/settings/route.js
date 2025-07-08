import { NextResponse } from 'next/server';
import { getSecureSession } from '@/utils/sessionUtils-v2';
import { standardSecurityHeaders } from '@/utils/responseHeaders';

export async function GET(request) {
  console.log('[Tax Settings API] GET request received');
  
  try {
    // Verify session
    const session = await getSecureSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401, 
        headers: standardSecurityHeaders 
      });
    }
    
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400, headers: standardSecurityHeaders }
      );
    }
    
    // Try to fetch tax settings from backend, fallback to empty
    let data = null;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com'}/api/taxes/settings/?tenant_id=${tenantId}`,
        {
          method: 'GET',
          headers: {
            'Cookie': request.headers.get('cookie') || ''
          },
          credentials: 'include',
          timeout: 5000
        }
      );
      
      if (response.ok) {
        data = await response.json();
      } else if (response.status !== 404) {
        console.warn(`[Tax Settings API] Backend responded with ${response.status}`);
      }
    } catch (backendError) {
      console.warn('[Tax Settings API] Backend not available:', backendError.message);
    }
    
    // Return empty settings if no data found (allows wizard to work)
    if (!data) {
      return NextResponse.json({
        businessInfo: null,
        taxRates: null
      }, { headers: standardSecurityHeaders });
    }
    
    return NextResponse.json({
      businessInfo: {
        businessName: data.business_name || '',
        businessType: data.business_type || 'retail',
        country: data.country || '',
        stateProvince: data.state_province || '',
        city: data.city || '',
        postalCode: data.postal_code || ''
      },
      taxRates: {
        salesTaxRate: data.sales_tax_rate || '',
        incomeTaxRate: data.income_tax_rate || '',
        payrollTaxRate: data.payroll_tax_rate || '',
        filingWebsite: data.filing_website || '',
        filingAddress: data.filing_address || '',
        filingDeadlines: data.filing_deadlines || ''
      },
      lastUpdated: data.updated_at,
      approvedBy: data.approved_by_name,
      approvedAt: data.approved_at
    }, { headers: standardSecurityHeaders });
    
  } catch (error) {
    console.error('[Tax Settings API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax settings' },
      { status: 500, headers: standardSecurityHeaders }
    );
  }
}

export async function POST(request) {
  console.log('[Tax Settings API] POST request received');
  
  try {
    // Verify session
    const session = await getSecureSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401, 
        headers: standardSecurityHeaders 
      });
    }
    
    const data = await request.json();
    const { tenantId, businessInfo, taxRates } = data;
    
    if (!tenantId || !businessInfo || !taxRates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: standardSecurityHeaders }
      );
    }
    
    // Save tax settings to backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/taxes/settings/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          tenant_id: tenantId,
          business_name: businessInfo.businessName,
          business_type: businessInfo.businessType,
          country: businessInfo.country,
          state_province: businessInfo.stateProvince,
          city: businessInfo.city,
          postal_code: businessInfo.postalCode,
          sales_tax_rate: parseFloat(taxRates.salesTaxRate) || 0,
          income_tax_rate: parseFloat(taxRates.incomeTaxRate) || 0,
          payroll_tax_rate: parseFloat(taxRates.payrollTaxRate) || 0,
          filing_website: taxRates.filingWebsite,
          filing_address: taxRates.filingAddress,
          filing_deadlines: taxRates.filingDeadlines
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Backend error: ${error}`);
    }
    
    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'Tax settings saved successfully'
    }, { headers: standardSecurityHeaders });
    
  } catch (error) {
    console.error('[Tax Settings API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to save tax settings' },
      { status: 500, headers: standardSecurityHeaders }
    );
  }
}