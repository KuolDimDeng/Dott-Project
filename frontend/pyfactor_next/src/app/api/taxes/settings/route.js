import { NextResponse } from 'next/server';
import { getSession } from '@/utils/sessionManager-v2-enhanced';

export async function GET(request) {
  console.log('[Tax Settings API] GET request received');
  
  try {
    // Verify session
    const session = await getSession();
    if (!session?.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }
    
    // Fetch tax settings from backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/taxes/settings/?tenant_id=${tenantId}`,
      {
        method: 'GET',
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        },
        credentials: 'include'
      }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        // No settings found, return empty
        return NextResponse.json({
          businessInfo: null,
          taxRates: null
        });
      }
      throw new Error(`Backend responded with ${response.status}`);
    }
    
    const data = await response.json();
    
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
    });
    
  } catch (error) {
    console.error('[Tax Settings API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax settings' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  console.log('[Tax Settings API] POST request received');
  
  try {
    // Verify session
    const session = await getSession();
    if (!session?.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    const { tenantId, businessInfo, taxRates } = data;
    
    if (!tenantId || !businessInfo || !taxRates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
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
    });
    
  } catch (error) {
    console.error('[Tax Settings API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to save tax settings' },
      { status: 500 }
    );
  }
}