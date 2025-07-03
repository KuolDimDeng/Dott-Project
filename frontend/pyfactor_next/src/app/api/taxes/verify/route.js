import { NextResponse } from 'next/server';
import sessionManagerEnhanced from '@/utils/sessionManager-v2-enhanced';

export async function POST(request) {
  console.log('[Tax Verify API] POST request received');
  
  try {
    // Verify session
    const session = await sessionManagerEnhanced.getSession();
    if (!session?.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    console.log('[Tax Verify API] Request data:', JSON.stringify(data, null, 2));
    const { 
      tenantId, 
      businessInfo, 
      taxRates, 
      signature, 
      agreedAt,
      suggestions,
      locations,
      industrySettings,
      validationPassed
    } = data;
    
    if (!tenantId || !businessInfo || !taxRates || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // First, save the tax settings
    const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/taxes/settings/`;
    const requestBody = {
          tenant_id: tenantId,
          business_name: businessInfo.businessName,
          business_type: businessInfo.businessType,
          country: businessInfo.country,
          state_province: businessInfo.stateProvince,
          city: businessInfo.city,
          postal_code: businessInfo.postalCode,
          // Map to the actual model fields
          sales_tax_rate: parseFloat(taxRates.totalSalesTaxRate) || parseFloat(taxRates.salesTaxRate) || 0,
          income_tax_rate: parseFloat(taxRates.corporateIncomeTaxRate) || parseFloat(taxRates.incomeTaxRate) || 0,
          payroll_tax_rate: parseFloat(taxRates.payrollTaxRate) || 0,
          filing_website: taxRates.filingWebsite || taxRates.stateTaxWebsite || '',
          filing_address: taxRates.filingAddress || taxRates.stateTaxAddress || '',
          filing_deadlines: JSON.stringify(taxRates.filingDeadlines || {}),
          approved_by_name: signature, // The signature is actually the name
          approved_by_signature: signature,
          approved_at: agreedAt,
          ai_suggested: suggestions ? true : false,
          ai_confidence_score: suggestions?.confidenceScore || null
        };
    
    console.log('[Tax Verify API] Calling backend URL:', backendUrl);
    console.log('[Tax Verify API] Backend request body:', JSON.stringify(requestBody, null, 2));
    
    const settingsResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
        'X-Tenant-ID': tenantId
      },
      credentials: 'include',
      body: JSON.stringify(requestBody)
    });
    
    if (!settingsResponse.ok) {
      const errorText = await settingsResponse.text();
      console.error('[Tax Verify API] Backend error response:', errorText);
      console.error('[Tax Verify API] Backend status:', settingsResponse.status);
      throw new Error(`Failed to save settings: ${errorText}`);
    }
    
    const settingsResult = await settingsResponse.json();
    
    // Send confirmation email
    try {
      const emailResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/taxes/send-confirmation/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || '',
            'X-Tenant-ID': tenantId
          },
          credentials: 'include',
          body: JSON.stringify({
            tenant_id: tenantId,
            tax_settings_id: settingsResult.id,
            recipient_email: session.email || session.user?.email,
            signature: signature,
            location: `${businessInfo.city}, ${businessInfo.stateProvince}, ${businessInfo.country}`,
            tax_rates: {
              sales: taxRates.totalSalesTaxRate || taxRates.salesTaxRate,
              income: taxRates.corporateIncomeTaxRate || taxRates.incomeTaxRate,
              payroll: taxRates.payrollTaxRate
            }
          })
        }
      );
      
      if (!emailResponse.ok) {
        console.error('[Tax Verify API] Email sending failed:', await emailResponse.text());
        // Don't fail the entire operation if email fails
      }
    } catch (emailError) {
      console.error('[Tax Verify API] Email error:', emailError);
      // Continue even if email fails
    }
    
    return NextResponse.json({
      success: true,
      id: settingsResult.id,
      message: 'Tax settings saved successfully with signature confirmation'
    });
    
  } catch (error) {
    console.error('[Tax Verify API] Error:', error);
    console.error('[Tax Verify API] Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to verify and save tax settings' },
      { status: 500 }
    );
  }
}