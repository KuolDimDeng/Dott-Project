import { NextResponse } from 'next/server';
import { getSession } from '@/utils/sessionManager-v2-enhanced';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export async function POST(request) {
  console.log('[Tax Suggestions API] Request received');
  
  try {
    // Check if API key is configured
    if (!process.env.CLAUDE_API_KEY) {
      console.error('[Tax Suggestions API] CLAUDE_API_KEY not configured');
      return NextResponse.json(
        { error: 'Tax suggestions service not configured. Please contact support.' },
        { status: 503 }
      );
    }
    
    // Verify session
    const session = await getSession();
    if (!session?.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { tenantId, businessInfo } = await request.json();
    
    if (!tenantId || !businessInfo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const { country, stateProvince, city, businessType } = businessInfo;
    
    // First, check if we have cached data for this location
    try {
      const cacheCheckResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/taxes/cache-check/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          credentials: 'include',
          body: JSON.stringify({
            country,
            state_province: stateProvince,
            city,
            business_type: businessType
          })
        }
      );
      
      if (cacheCheckResponse.ok) {
        const cachedData = await cacheCheckResponse.json();
        if (cachedData.found) {
          console.log('[Tax Suggestions API] Using cached data');
          return NextResponse.json({
            suggestedRates: {
              salesTaxRate: cachedData.sales_tax_rate,
              incomeTaxRate: cachedData.income_tax_rate,
              payrollTaxRate: cachedData.payroll_tax_rate,
              filingWebsite: cachedData.filing_website,
              filingAddress: cachedData.filing_address,
              filingDeadlines: cachedData.filing_deadlines
            },
            confidenceScore: cachedData.confidence_score,
            source: 'cache',
            expiresAt: cachedData.expires_at
          });
        }
      }
    } catch (cacheError) {
      console.error('[Tax Suggestions API] Cache check error:', cacheError);
      // Continue to API call if cache check fails
    }
    
    // Check API usage limits
    try {
      const usageCheckResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/taxes/check-usage/`,
        {
          method: 'GET',
          headers: {
            'Cookie': request.headers.get('cookie') || ''
          },
          credentials: 'include'
        }
      );
      
      if (usageCheckResponse.ok) {
        const usage = await usageCheckResponse.json();
        if (usage.limit_reached) {
          return NextResponse.json(
            { error: 'Monthly API limit reached. Please try again next month.' },
            { status: 429 }
          );
        }
      }
    } catch (usageError) {
      console.error('[Tax Suggestions API] Usage check error:', usageError);
    }
    
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
        model: 'claude-3-opus-20240229',
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
      
      // Save to cache
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/taxes/cache-save/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || ''
            },
            credentials: 'include',
            body: JSON.stringify({
              country,
              state_province: stateProvince,
              city,
              business_type: businessType,
              sales_tax_rate: taxData.salesTaxRate,
              income_tax_rate: taxData.incomeTaxRate,
              payroll_tax_rate: taxData.payrollTaxRate,
              filing_website: taxData.filingWebsite,
              filing_address: taxData.filingAddress,
              filing_deadlines: taxData.filingDeadlines,
              confidence_score: taxData.confidenceScore,
              source: 'claude_api'
            })
          }
        );
      } catch (cacheError) {
        console.error('[Tax Suggestions API] Error saving to cache:', cacheError);
      }
      
      // Track API usage
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/taxes/track-usage/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || ''
            },
            credentials: 'include',
            body: JSON.stringify({
              jurisdiction_queried: `${city}, ${stateProvince}, ${country}`,
              credits_used: 1
            })
          }
        );
      } catch (trackError) {
        console.error('[Tax Suggestions API] Error tracking usage:', trackError);
      }
      
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
      });
      
    } catch (apiError) {
      console.error('[Tax Suggestions API] Claude API error:', apiError);
      return NextResponse.json(
        { error: 'Failed to get tax suggestions. Please try again later.' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('[Tax Suggestions API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}