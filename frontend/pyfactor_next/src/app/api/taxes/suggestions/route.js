import { NextResponse } from 'next/server';
import { getSecureSession } from '@/utils/sessionUtils-v2';
import { standardSecurityHeaders } from '@/utils/responseHeaders';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
let anthropic;
try {
  if (!process.env.CLAUDE_TAX_API_KEY) {
    console.error('[Tax Suggestions API] CLAUDE_TAX_API_KEY is not defined in environment');
  } else {
    console.log('[Tax Suggestions API] Initializing Anthropic client with API key');
    anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_TAX_API_KEY,
    });
    console.log('[Tax Suggestions API] Anthropic client initialized successfully');
  }
} catch (error) {
  console.error('[Tax Suggestions API] Failed to initialize Anthropic client:', error);
  console.error('[Tax Suggestions API] Error details:', error.message);
}

export async function POST(request) {
  console.log('[Tax Suggestions API] Request received');
  console.log('[Tax Suggestions API] API Key exists:', !!process.env.CLAUDE_TAX_API_KEY);
  console.log('[Tax Suggestions API] API Key first 10 chars:', process.env.CLAUDE_TAX_API_KEY?.substring(0, 10) + '...');
  console.log('[Tax Suggestions API] Anthropic client initialized:', !!anthropic);
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
    
    console.log('[Tax Suggestions API] Input data:', { 
      country, 
      stateProvince, 
      city, 
      businessType,
      tenantId 
    });
    
    // First, try to get data from backend cache
    try {
      console.log('[Tax Suggestions API] Checking backend cache...');
      const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/taxes/suggestions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({ businessInfo })
      });
      
      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        console.log('[Tax Suggestions API] Backend cache hit!');
        
        // If we got real data from backend (not zeros), return it
        if (backendData.suggestedRates && 
            (backendData.suggestedRates.stateSalesTaxRate > 0 || 
             backendData.suggestedRates.totalSalesTaxRate > 0)) {
          return NextResponse.json(backendData, { headers: standardSecurityHeaders });
        }
      }
      console.log('[Tax Suggestions API] Backend returned no data or zeros, falling back to direct Claude API');
    } catch (backendError) {
      console.error('[Tax Suggestions API] Backend call failed:', backendError.message);
    }
    
    // Call Claude API for tax suggestions
    console.log('[Tax Suggestions API] Calling Claude API...');
    
    const prompt = `You are a tax expert assistant providing CURRENT 2024 tax rates. Based on the following business information, provide accurate and comprehensive tax rate suggestions and filing information.

Business Information:
- Type: ${businessType}
- Location: ${city}, ${stateProvince}, ${country}

IMPORTANT: 
- Use the most current tax rates as of 2024
- For countries with progressive personal income tax (like Kenya, USA), provide tax brackets
- Include ALL relevant taxes for the location, even if not listed in the structure below
- Any additional country-specific taxes should be included as extra fields
- YOU MUST RESPOND WITH VALID JSON ONLY - NO ADDITIONAL TEXT BEFORE OR AFTER THE JSON

Please provide comprehensive tax information:

SALES TAX:
- State/Regional Sales Tax Rate
- Local/City Sales Tax Rate
- Total Sales Tax Rate

CORPORATE INCOME TAX:
- Corporate Income Tax Rate (for businesses)

PERSONAL INCOME TAX:
- Check if the country uses progressive tax brackets
- If progressive: provide all brackets with income ranges and rates
- If flat rate: provide the single rate
- For Kenya example: First KES 24,000: 10%, Next KES 8,333: 25%, etc.

SOCIAL INSURANCE:
- Health Insurance (employee and employer rates)
- Social Security/Pension (employee and employer rates)
- Any other mandatory insurance

PAYROLL TAX:
- Federal/National Payroll Tax Rate
- State/Regional Payroll Tax Rate

FILING INFORMATION:
- All relevant tax websites and physical addresses
- Filing deadlines for each tax type

ADDITIONAL TAXES:
- Include ANY other taxes specific to this location (e.g., VAT, GST, capital gains, wealth tax, etc.)

Format your response as JSON. Include all standard fields below, plus any additional country-specific fields.

For Utah specifically, the sales tax rates should be:
- State: 4.85%
- Local (Layton): 1.35%
- Total: 6.2%

Return ONLY this JSON structure:
{
  "stateSalesTaxRate": number,
  "localSalesTaxRate": number,
  "totalSalesTaxRate": number,
  "corporateIncomeTaxRate": number,
  "hasProgressiveTax": boolean,
  "personalIncomeTaxBrackets": [
    {
      "minIncome": number,
      "maxIncome": number or null for highest bracket,
      "rate": number,
      "description": "string (e.g., 'First KES 24,000')"
    }
  ],
  "flatPersonalIncomeTaxRate": number (if not progressive),
  "healthInsuranceRate": number,
  "healthInsuranceEmployerRate": number,
  "socialSecurityRate": number,
  "socialSecurityEmployerRate": number,
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
    "payrollTax": "string",
    "corporateTax": "string"
  },
  "confidenceScore": number,
  "notes": "string",
  // Add any additional country-specific fields here
}`;

    console.log('[Tax Suggestions API] Sending prompt to Claude:');
    console.log('[Tax Suggestions API] Prompt length:', prompt.length);
    console.log('[Tax Suggestions API] Full prompt:', prompt);

    // Helper function to make Claude API call with retry logic
    const callClaudeWithRetry = async (attemptNumber = 1, maxAttempts = 3) => {
      console.log(`[Tax Suggestions API] Claude API attempt ${attemptNumber}/${maxAttempts}`);
      
      const retryPrompt = attemptNumber > 1 ? 
        `Your previous response was not valid JSON. Please respond with ONLY valid JSON, no text before or after.\n\n${prompt}` : 
        prompt;
      
      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0,
        system: "You are a tax expert that provides accurate, up-to-date tax information for businesses worldwide. Always provide current 2024 tax rates. Be specific about state vs federal taxes. Always provide conservative estimates and include disclaimers when appropriate. CRITICAL: You must ONLY respond with valid JSON - no explanatory text, no markdown, just the JSON object.",
        messages: [
          {
            role: 'user',
            content: retryPrompt
          }
        ]
      });
      
      return message;
    };
    
    let taxData = null;
    let lastError = null;
    
    // Try up to 3 times to get valid JSON from Claude
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Tax Suggestions API] Attempt ${attempt} - Calling Claude API`);
        const message = await callClaudeWithRetry(attempt, 3);
        console.log('[Tax Suggestions API] Claude API call successful');
      
        // Parse the response
        const responseText = message.content[0].text;
        console.log('[Tax Suggestions API] Claude response length:', responseText.length);
        
        if (attempt === 1) {
          console.log('[Tax Suggestions API] First 500 chars of response:', responseText.substring(0, 500));
        }
      
      try {
        // First try to find JSON by looking for the pattern
        let jsonString = null;
        
        // Method 1: Look for JSON block in code fence
        const codeFenceMatch = responseText.match(/```json\s*\n([\s\S]*?)\n```/);
        if (codeFenceMatch) {
          jsonString = codeFenceMatch[1];
          console.log('[Tax Suggestions API] Found JSON in code fence');
        }
        
        // Method 2: Look for JSON block without language specifier
        if (!jsonString) {
          const plainCodeFenceMatch = responseText.match(/```\s*\n([\s\S]*?)\n```/);
          if (plainCodeFenceMatch) {
            jsonString = plainCodeFenceMatch[1];
            console.log('[Tax Suggestions API] Found JSON in plain code fence');
          }
        }
        
        // Method 3: Look for raw JSON object
        if (!jsonString) {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonString = jsonMatch[0];
            console.log('[Tax Suggestions API] Found raw JSON object');
          }
        }
        
        if (!jsonString) {
          console.log('[Tax Suggestions API] No JSON pattern found, Claude might have returned plain text');
          console.log('[Tax Suggestions API] First 1000 chars of response:', responseText.substring(0, 1000));
          throw new Error('No JSON found in response');
        }
        
        console.log('[Tax Suggestions API] JSON found at position:', responseText.indexOf(jsonString));
        console.log('[Tax Suggestions API] JSON length:', jsonString.length);
        
        // Clean the JSON string before parsing
        jsonString = jsonString
          .replace(/^\uFEFF/, '') // Remove BOM
          .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
          .trim();
        
        taxData = JSON.parse(jsonString);
        console.log('[Tax Suggestions API] Successfully parsed JSON on attempt', attempt);
        
        // Validate that we got actual tax data
        if (taxData && typeof taxData === 'object' && 
            (taxData.stateSalesTaxRate > 0 || taxData.localSalesTaxRate > 0 || 
             taxData.totalSalesTaxRate > 0)) {
          console.log('[Tax Suggestions API] Valid tax data received');
          break; // Success - exit retry loop
        } else {
          throw new Error('Parsed JSON contains all zero values');
        }
        
      } catch (parseError) {
        lastError = parseError;
        console.error(`[Tax Suggestions API] Attempt ${attempt} - Error parsing:`, parseError.message);
        
        if (attempt < 3) {
          console.log(`[Tax Suggestions API] Will retry with more explicit instructions`);
          continue;
        }
        
      }
    } catch (attemptError) {
      lastError = attemptError;
      console.error(`[Tax Suggestions API] Attempt ${attempt} failed:`, attemptError.message);
    }
    }
    
    // If all attempts failed, use fallback data
    if (!taxData) {
      console.warn('[Tax Suggestions API] All attempts failed. Using fallback data.');
      console.error('[Tax Suggestions API] Last error:', lastError);
      taxData = {
        stateSalesTaxRate: 0,
        localSalesTaxRate: 0,
        totalSalesTaxRate: 0,
        corporateIncomeTaxRate: 0,
        hasProgressiveTax: false,
        personalIncomeTaxBrackets: [],
        flatPersonalIncomeTaxRate: 0,
        healthInsuranceRate: 0,
        healthInsuranceEmployerRate: 0,
        socialSecurityRate: 0,
        socialSecurityEmployerRate: 0,
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
          payrollTax: '',
          corporateTax: ''
        },
        confidenceScore: 0,
        notes: 'Unable to parse tax information after 3 attempts. Please enter manually.'
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
          
          // Corporate Income Tax
          corporateIncomeTaxRate: taxData.corporateIncomeTaxRate,
          
          // Personal Income Tax
          hasProgressiveTax: taxData.hasProgressiveTax,
          personalIncomeTaxBrackets: taxData.personalIncomeTaxBrackets,
          flatPersonalIncomeTaxRate: taxData.flatPersonalIncomeTaxRate,
          
          // Social Insurance
          healthInsuranceRate: taxData.healthInsuranceRate,
          healthInsuranceEmployerRate: taxData.healthInsuranceEmployerRate,
          socialSecurityRate: taxData.socialSecurityRate,
          socialSecurityEmployerRate: taxData.socialSecurityEmployerRate,
          
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
      console.error('[Tax Suggestions API] Error type:', apiError.constructor.name);
      console.error('[Tax Suggestions API] Error message:', apiError.message);
      console.error('[Tax Suggestions API] Error stack:', apiError.stack);
      
      // Return more detailed error info for debugging
      return NextResponse.json(
        { 
          error: 'Failed to get tax suggestions. Please try again later.',
          debugInfo: {
            errorType: apiError.constructor.name,
            errorMessage: apiError.message,
            apiKeyExists: !!process.env.CLAUDE_TAX_API_KEY,
            apiKeyLength: process.env.CLAUDE_TAX_API_KEY?.length
          }
        },
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