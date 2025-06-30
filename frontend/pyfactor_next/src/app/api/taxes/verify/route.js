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
          // Sales tax breakdown
          state_sales_tax_rate: parseFloat(taxRates.stateSalesTaxRate) || 0,
          local_sales_tax_rate: parseFloat(taxRates.localSalesTaxRate) || 0,
          total_sales_tax_rate: parseFloat(taxRates.totalSalesTaxRate) || 0,
          
          // Corporate income tax
          corporate_income_tax_rate: parseFloat(taxRates.corporateIncomeTaxRate) || 0,
          
          // Personal income tax
          has_progressive_tax: taxRates.hasProgressiveTax || false,
          personal_income_tax_brackets: taxRates.personalIncomeTaxBrackets || [],
          flat_personal_income_tax_rate: parseFloat(taxRates.flatPersonalIncomeTaxRate) || null,
          
          // Social insurance
          health_insurance_rate: parseFloat(taxRates.healthInsuranceRate) || 0,
          health_insurance_employer_rate: parseFloat(taxRates.healthInsuranceEmployerRate) || 0,
          social_security_rate: parseFloat(taxRates.socialSecurityRate) || 0,
          social_security_employer_rate: parseFloat(taxRates.socialSecurityEmployerRate) || 0,
          
          // Payroll taxes
          federal_payroll_tax_rate: parseFloat(taxRates.federalPayrollTaxRate) || 0,
          state_payroll_tax_rate: parseFloat(taxRates.statePayrollTaxRate) || 0,
          
          // Filing information
          state_tax_website: taxRates.stateTaxWebsite || '',
          state_tax_address: taxRates.stateTaxAddress || '',
          local_tax_website: taxRates.localTaxWebsite || '',
          local_tax_address: taxRates.localTaxAddress || '',
          federal_tax_website: taxRates.federalTaxWebsite || '',
          filing_deadlines: taxRates.filingDeadlines || {},
          
          // Enhanced features
          locations: locations || [],
          industry_settings: industrySettings || {},
          validation_passed: validationPassed || false,
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