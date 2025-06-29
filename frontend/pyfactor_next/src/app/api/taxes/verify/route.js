import { NextResponse } from 'next/server';
import { getSession } from '@/utils/sessionManager-v2-enhanced';

export async function POST(request) {
  console.log('[Tax Verify API] POST request received');
  
  try {
    // Verify session
    const session = await getSession();
    if (!session?.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    const { 
      tenantId, 
      businessInfo, 
      taxRates, 
      signature, 
      agreedAt,
      suggestions 
    } = data;
    
    if (!tenantId || !businessInfo || !taxRates || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // First, save the tax settings
    const settingsResponse = await fetch(
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
          filing_deadlines: taxRates.filingDeadlines,
          approved_by_signature: signature,
          approved_at: agreedAt,
          ai_suggested: suggestions ? true : false,
          ai_confidence_score: suggestions?.confidenceScore || null
        })
      }
    );
    
    if (!settingsResponse.ok) {
      const error = await settingsResponse.text();
      throw new Error(`Failed to save settings: ${error}`);
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
            'Cookie': request.headers.get('cookie') || ''
          },
          credentials: 'include',
          body: JSON.stringify({
            tenant_id: tenantId,
            tax_settings_id: settingsResult.id,
            recipient_email: session.email || session.user?.email,
            signature: signature,
            location: `${businessInfo.city}, ${businessInfo.stateProvince}, ${businessInfo.country}`,
            tax_rates: {
              sales: taxRates.salesTaxRate,
              income: taxRates.incomeTaxRate,
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
    return NextResponse.json(
      { error: 'Failed to verify and save tax settings' },
      { status: 500 }
    );
  }
}