import { NextResponse } from 'next/server';
import { getSecureSession } from '@/utils/sessionUtils-v2';
import { standardSecurityHeaders } from '@/utils/responseHeaders';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
let anthropic;
try {
  anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_TAX_API_KEY,
  });
} catch (error) {
  console.error('[Tax Suggestions API] Failed to initialize Anthropic client:', error);
}

export async function POST(request) {
  console.log('[Tax Suggestions API] Request received');
  console.log('[Tax Suggestions API] API Key exists:', !!process.env.CLAUDE_TAX_API_KEY);
  console.log('[Tax Suggestions API] Backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
  
  try {
    // Check if API key is configured
    if (!process.env.CLAUDE_TAX_API_KEY || !anthropic) {
      console.error('[Tax Suggestions API] CLAUDE_TAX_API_KEY not configured or Anthropic client not initialized');
      return NextResponse.json(
        { error: 'Tax suggestions service not configured. Please contact support.' },
        { status: 503, headers: standardSecurityHeaders }
      );
    }
    
    // Verify session
    const session = await getSecureSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401, 
        headers: standardSecurityHeaders 
      });
    }
    
    const { tenantId, businessInfo } = await request.json();
    
    if (!tenantId || !businessInfo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: standardSecurityHeaders }
      );
    }
    
    const { country, stateProvince, city, businessType } = businessInfo;
    
    // Skip cache and usage checks for now since backend endpoints might not exist
    console.log('[Tax Suggestions API] Skipping cache checks - proceeding directly to Claude API');
    
    // Call Claude API for tax suggestions
    console.log('[Tax Suggestions API] Calling Claude API...');
    
    const prompt = `You are a tax expert assistant providing CURRENT 2024 tax rates. Based on the following business information, provide accurate tax rate suggestions and filing information.

Business Information:
- Type: ${businessType}
- Location: ${city}, ${stateProvince}, ${country}

IMPORTANT: Use the most current tax rates as of 2024. For Utah specifically:
- State Sales Tax: 4.85% base rate (plus local taxes which vary by city)
- State Income Tax: 4.65% flat rate (as of 2024)
- Look up the specific local sales tax rate for ${city}, ${stateProvince}

Please provide the following tax information broken down by jurisdiction:

SALES TAX:
1. State Sales Tax Rate - ${stateProvince} state rate only (e.g., 4.85 for Utah)
2. Local Sales Tax Rate - ${city} local rate only (e.g., 2.0)
3. Total Sales Tax Rate - Combined state + local

INCOME TAX:
4. Federal Income Tax Rate - US federal corporate/business rate
5. State Income Tax Rate - ${stateProvince} state rate
6. Total Income Tax Rate - Combined federal + state

PAYROLL TAX:
7. Federal Payroll Tax Rate - FICA, Medicare, Federal unemployment
8. State Payroll Tax Rate - State unemployment, disability if applicable

FILING INFORMATION:
9. State Tax Website - Official ${stateProvince} tax website
10. State Tax Filing Address - Physical address for state taxes
11. Local Tax Website - ${city} tax website if applicable
12. Local Tax Filing Address - ${city} tax office if separate from state
13. Federal Tax Website - IRS website
14. Important Filing Deadlines - Broken down by tax type and jurisdiction

Provide a confidence score (0-100) for accuracy and include any important notes.

Format your response as JSON with the following structure:
{
  "stateSalesTaxRate": number,
  "localSalesTaxRate": number,
  "totalSalesTaxRate": number,
  "federalIncomeTaxRate": number,
  "stateIncomeTaxRate": number,
  "totalIncomeTaxRate": number,
  "federalPayrollTaxRate": number,
  "statePayrollTaxRate": number,
  "stateTaxWebsite": "string",
  "stateTaxAddress": "string",
  "localTaxWebsite": "string",
  "localTaxAddress": "string",
  "federalTaxWebsite": "string",
  "filingDeadlines": {
    "salesTax": "string",
    "incomeTax": "string",
    "payrollTax": "string"
  },
  "confidenceScore": number,
  "notes": "string"
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0,
        system: "You are a tax expert that provides accurate, up-to-date tax information for businesses worldwide. Always provide current 2024 tax rates. Be specific about state vs federal taxes. Always provide conservative estimates and include disclaimers when appropriate.",
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      
      // Parse the response
      const responseText = message.content[0].text;
      let taxData;
      
      try {
        // Extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          taxData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('[Tax Suggestions API] Error parsing Claude response:', parseError);
        // Fallback to a structured response
        taxData = {
          stateSalesTaxRate: 0,
          localSalesTaxRate: 0,
          totalSalesTaxRate: 0,
          federalIncomeTaxRate: 0,
          stateIncomeTaxRate: 0,
          totalIncomeTaxRate: 0,
          federalPayrollTaxRate: 0,
          statePayrollTaxRate: 0,
          stateTaxWebsite: '',
          stateTaxAddress: '',
          localTaxWebsite: '',
          localTaxAddress: '',
          federalTaxWebsite: 'https://www.irs.gov',
          filingDeadlines: {
            salesTax: '',
            incomeTax: '',
            payrollTax: ''
          },
          confidenceScore: 0,
          notes: 'Unable to parse tax information. Please enter manually.'
        };
      }
      
      // Skip cache save and usage tracking for now
      console.log('[Tax Suggestions API] Skipping cache save and usage tracking');
      
      // Log the parsed data for debugging
      console.log('[Tax Suggestions API] Parsed tax data:', JSON.stringify(taxData, null, 2));
      
      return NextResponse.json({
        suggestedRates: {
          // Sales Tax breakdown
          stateSalesTaxRate: taxData.stateSalesTaxRate,
          localSalesTaxRate: taxData.localSalesTaxRate,
          totalSalesTaxRate: taxData.totalSalesTaxRate,
          
          // Income Tax breakdown
          federalIncomeTaxRate: taxData.federalIncomeTaxRate,
          stateIncomeTaxRate: taxData.stateIncomeTaxRate,
          totalIncomeTaxRate: taxData.totalIncomeTaxRate,
          
          // Payroll Tax breakdown
          federalPayrollTaxRate: taxData.federalPayrollTaxRate,
          statePayrollTaxRate: taxData.statePayrollTaxRate,
          
          // Filing information
          stateTaxWebsite: taxData.stateTaxWebsite,
          stateTaxAddress: taxData.stateTaxAddress,
          localTaxWebsite: taxData.localTaxWebsite,
          localTaxAddress: taxData.localTaxAddress,
          federalTaxWebsite: taxData.federalTaxWebsite || 'https://www.irs.gov',
          
          // Deadlines
          filingDeadlines: taxData.filingDeadlines
        },
        confidenceScore: taxData.confidenceScore,
        notes: taxData.notes,
        source: 'claude_api'
      }, { headers: standardSecurityHeaders });
      
    } catch (apiError) {
      console.error('[Tax Suggestions API] Claude API error:', apiError);
      return NextResponse.json(
        { error: 'Failed to get tax suggestions. Please try again later.' },
        { status: 500, headers: standardSecurityHeaders }
      );
    }
    
  } catch (error) {
    console.error('[Tax Suggestions API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: standardSecurityHeaders }
    );
  }
}