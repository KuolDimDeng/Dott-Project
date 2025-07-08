import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

// Claude API configuration
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_MODEL = process.env.CLAUDE_API_MODEL || 'claude-sonnet-4-20250514';

// Rate limiting
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3;

function checkRateLimit(tenantId) {
  const now = Date.now();
  const userRequests = requestCounts.get(tenantId) || [];
  
  // Filter out old requests
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  // Add current request
  recentRequests.push(now);
  requestCounts.set(tenantId, recentRequests);
  
  return true;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { tenantId, stepType, stepData, previousSteps } = body;
    
    if (!tenantId || !stepType || !stepData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Check rate limit
    if (!checkRateLimit(tenantId)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429 }
      );
    }
    
    // Check Claude API key - provide fallback if not available
    if (!CLAUDE_API_KEY) {
      logger.warn('[API] Claude API key not configured, providing basic fallback');
      return NextResponse.json({
        explanation: 'AI suggestions are temporarily unavailable. Please enter tax rates manually or consult your tax advisor.',
        confidence: 0,
        fallback: true
      });
    }
    
    // Build context based on step type
    let prompt = '';
    
    switch (stepType) {
      case 'taxRates':
        prompt = `You are a tax rate expert helping a business configure their tax settings.

Business Information:
- Business Name: ${stepData.businessName}
- Business Type: ${stepData.businessType}
- Location: ${stepData.city}, ${stepData.stateProvince}, ${stepData.country}
- Postal Code: ${stepData.postalCode}

Please provide the current tax rates for this location. Include:
1. State sales tax rate
2. Local/city sales tax rate
3. Corporate income tax rate
4. Personal income tax (specify if progressive with brackets or flat rate)
5. Explanation of how you determined these rates
6. Sources for verification
7. Confidence level (0-100%)

Return the response in this JSON format:
{
  "suggestedData": {
    "stateSalesTaxRate": "X.XX",
    "localSalesTaxRate": "X.XX",
    "totalSalesTaxRate": "X.XX",
    "corporateIncomeTaxRate": "X.XX",
    "hasProgressiveTax": true/false,
    "personalIncomeTaxBrackets": [...] or "flatPersonalIncomeTaxRate": "X.XX"
  },
  "explanation": "Clear explanation of the tax structure",
  "sources": [
    {
      "name": "Official source name",
      "url": "https://...",
      "type": "official/government/reliable"
    }
  ],
  "confidence": 95
}`;
        break;
        
      case 'benefits':
        const businessInfo = previousSteps.businessInfo || stepData;
        const taxRates = previousSteps.taxRates || {};
        
        prompt = `You are a benefits and payroll tax expert helping a business configure their settings.

Business Location: ${businessInfo.city}, ${businessInfo.stateProvince}, ${businessInfo.country}
Business Type: ${businessInfo.businessType}

Based on this location, provide the current rates for:
1. Health insurance (employee and employer contributions)
2. Social security/pension (employee and employer contributions)
3. Federal payroll tax
4. State payroll tax
5. Any other mandatory benefits or insurance

Return the response in this JSON format:
{
  "suggestedData": {
    "healthInsuranceRate": "X.XX",
    "healthInsuranceEmployerRate": "X.XX",
    "socialSecurityRate": "X.XX",
    "socialSecurityEmployerRate": "X.XX",
    "federalPayrollTaxRate": "X.XX",
    "statePayrollTaxRate": "X.XX"
  },
  "explanation": "Clear explanation of the benefits structure",
  "sources": [...]
}`;
        break;
        
      case 'filingInfo':
        const location = previousSteps.businessInfo || stepData;
        
        prompt = `You are a tax filing expert helping a business understand filing requirements.

Business Location: ${location.city}, ${location.stateProvince}, ${location.country}

Provide filing information including:
1. Federal tax website and office address
2. State tax website and office address
3. Local tax website and office address (if applicable)
4. Filing deadlines for each tax type (sales, income, payroll, corporate)

Return the response in this JSON format:
{
  "suggestedData": {
    "federalTaxWebsite": "https://...",
    "stateTaxWebsite": "https://...",
    "stateTaxAddress": "...",
    "localTaxWebsite": "https://...",
    "localTaxAddress": "...",
    "filingDeadlines": {
      "salesTax": "Monthly by 20th",
      "incomeTax": "April 15",
      "payrollTax": "Quarterly",
      "corporateTax": "March 15"
    }
  },
  "explanation": "Filing requirements explanation",
  "sources": [...]
}`;
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid step type' }, { status: 400 });
    }
    
    // Call Claude API
    logger.info(`[API] Calling Claude for ${stepType} suggestions`);
    
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_API_MODEL,
        max_tokens: 1500,
        temperature: 0.2,
        system: `You are a tax expert assistant. Always provide accurate, up-to-date tax information.
When you don't have certain information, clearly state that and suggest where to find it.
Always cite your sources and indicate your confidence level.
Format all responses as valid JSON.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    if (!claudeResponse.ok) {
      const error = await claudeResponse.text();
      logger.error('[API] Claude API error:', error);
      
      // Return fallback response instead of throwing error
      return NextResponse.json({
        explanation: 'AI suggestions are temporarily unavailable. Please enter tax rates manually or consult your tax advisor.',
        confidence: 0,
        fallback: true,
        error: 'Claude API unavailable'
      });
    }
    
    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content[0].text;
    
    // Parse Claude's response
    let suggestions;
    try {
      // Extract JSON from response (Claude might include extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      logger.error('[API] Failed to parse Claude response:', parseError);
      // Return a basic response
      suggestions = {
        explanation: 'Unable to parse tax suggestions. Please enter rates manually.',
        confidence: 0
      };
    }
    
    // Track usage (you would save this to database)
    // await updateApiUsage(tenantId);
    
    return NextResponse.json(suggestions);
    
  } catch (error) {
    logger.error('[API] Tax wizard suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to get tax suggestions' },
      { status: 500 }
    );
  }
}