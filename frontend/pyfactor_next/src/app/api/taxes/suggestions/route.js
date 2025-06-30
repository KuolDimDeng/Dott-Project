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
    
    const prompt = `You are a tax expert assistant. Based on the following business information, provide accurate tax rate suggestions and filing information.

Business Information:
- Type: ${businessType}
- Location: ${city}, ${stateProvince}, ${country}

Please provide the following in a structured format:
1. Sales Tax Rate (as a percentage, e.g., 8.75)
2. Income Tax Rate (corporate/business rate as a percentage)
3. Payroll Tax Rate (combined employer contribution as a percentage)
4. Tax Filing Website (official government website URL)
5. Tax Filing Address (physical mailing address for tax documents)
6. Important Filing Deadlines (key dates throughout the year)

Also provide a confidence score (0-100) for how accurate these suggestions are based on the location provided.

Format your response as JSON with the following structure:
{
  "salesTaxRate": number,
  "incomeTaxRate": number,
  "payrollTaxRate": number,
  "filingWebsite": "string",
  "filingAddress": "string",
  "filingDeadlines": "string",
  "confidenceScore": number,
  "notes": "string"
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0,
        system: "You are a tax expert that provides accurate, up-to-date tax information for businesses worldwide. Always provide conservative estimates and include disclaimers when appropriate.",
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
          salesTaxRate: 0,
          incomeTaxRate: 0,
          payrollTaxRate: 0,
          filingWebsite: '',
          filingAddress: '',
          filingDeadlines: '',
          confidenceScore: 0,
          notes: 'Unable to parse tax information. Please enter manually.'
        };
      }
      
      // Skip cache save and usage tracking for now
      console.log('[Tax Suggestions API] Skipping cache save and usage tracking');
      
      return NextResponse.json({
        suggestedRates: {
          salesTaxRate: taxData.salesTaxRate,
          incomeTaxRate: taxData.incomeTaxRate,
          payrollTaxRate: taxData.payrollTaxRate,
          filingWebsite: taxData.filingWebsite,
          filingAddress: taxData.filingAddress,
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