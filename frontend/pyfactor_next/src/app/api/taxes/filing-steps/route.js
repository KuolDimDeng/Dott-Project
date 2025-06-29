import { NextResponse } from 'next/server';
import { getSecureSession } from '@/utils/sessionUtils-v2';
import { standardSecurityHeaders } from '@/utils/responseHeaders';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
  try {
    const session = await getSecureSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      businessInfo, 
      taxSettings, 
      filingPeriod, 
      financialData,
      filingType // 'sales_tax', 'income_tax', or 'both'
    } = body;

    if (!businessInfo || !taxSettings) {
      return NextResponse.json(
        { error: 'Missing required business information' },
        { status: 400, headers: standardSecurityHeaders }
      );
    }

    // Check if we have cached steps for this specific scenario
    const cacheKey = `${taxSettings.country}_${taxSettings.stateProvince}_${filingType}_${filingPeriod}`;
    
    // For now, we'll generate fresh each time, but in production you'd check cache first

    if (!process.env.CLAUDE_TAX_API_KEY) {
      return NextResponse.json(
        { error: 'Tax API key not configured' },
        { status: 500, headers: standardSecurityHeaders }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_TAX_API_KEY,
    });

    // Build context about the business
    const businessContext = `
Business Information:
- Name: ${businessInfo.businessName}
- Type: ${businessInfo.businessType}
- Location: ${taxSettings.city}, ${taxSettings.stateProvince}, ${taxSettings.country}
- Tax ID/EIN: ${taxSettings.taxId || 'Not provided'}
- Business Address: ${taxSettings.street}, ${taxSettings.city}, ${taxSettings.stateProvince} ${taxSettings.postalCode}

Tax Rates:
- Sales Tax Rate: ${taxSettings.salesTaxRate}%
- Income Tax Rate: ${taxSettings.incomeTaxRate}%

Filing Period: ${filingPeriod}
${financialData ? `
Financial Summary:
- Total Sales: $${financialData.totalSales}
- Taxable Sales: $${financialData.taxableSales}
- Net Income: $${financialData.netIncome}
- Total Expenses: $${financialData.totalExpenses}
` : ''}

Filing Type: ${filingType === 'both' ? 'Sales Tax and Income Tax' : filingType.replace('_', ' ').toUpperCase()}
`;

    const prompt = `You are a tax filing assistant helping a business owner file their taxes. Based on the following business information, provide a detailed, step-by-step guide for filing ${filingType === 'both' ? 'both sales tax and income tax' : filingType.replace('_', ' ')}.

${businessContext}

Please provide:
1. A customized step-by-step filing process specific to their location and business type
2. Required forms and documentation they'll need
3. Important deadlines and dates
4. Common mistakes to avoid
5. Tips for their specific situation
6. Any location-specific requirements or considerations

Format the response as JSON with the following structure:
{
  "overview": "Brief overview of the filing process",
  "preparation": {
    "documents_needed": ["list of required documents"],
    "forms_required": ["list of tax forms"],
    "information_to_gather": ["list of information to collect"]
  },
  "filing_steps": [
    {
      "step_number": 1,
      "title": "Step title",
      "description": "Detailed description",
      "tips": ["helpful tips"],
      "warnings": ["things to be careful about"],
      "estimated_time": "time estimate"
    }
  ],
  "deadlines": [
    {
      "type": "deadline type",
      "date": "specific date or general timing",
      "description": "what this deadline is for"
    }
  ],
  "common_mistakes": [
    {
      "mistake": "description of mistake",
      "how_to_avoid": "how to avoid it"
    }
  ],
  "location_specific": {
    "requirements": ["specific requirements for their location"],
    "benefits": ["any tax benefits or credits available"],
    "resources": ["helpful local resources"]
  },
  "next_steps": ["what to do after filing"],
  "professional_help": {
    "when_needed": "when to consider professional help",
    "types": ["types of professionals who can help"]
  }
}`;

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2500,
      temperature: 0.3, // Lower temperature for more consistent, factual responses
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    // Parse the response
    let filingSteps;
    try {
      const responseText = message.content[0].text;
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        filingSteps = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[filing-steps] Error parsing Claude response:', parseError);
      // Return a fallback response
      filingSteps = {
        overview: "Follow these general steps to file your taxes",
        preparation: {
          documents_needed: ["Business financial records", "Previous tax returns", "Bank statements"],
          forms_required: ["Check with your local tax authority"],
          information_to_gather: ["Total sales", "Business expenses", "Tax ID numbers"]
        },
        filing_steps: [
          {
            step_number: 1,
            title: "Gather Your Documents",
            description: "Collect all necessary financial records and tax documents",
            tips: ["Organize by month", "Keep digital copies"],
            warnings: ["Don't miss any income sources"],
            estimated_time: "1-2 hours"
          },
          {
            step_number: 2,
            title: "Calculate Your Tax Liability",
            description: "Use the tax rates to calculate what you owe",
            tips: ["Double-check your math", "Consider using tax software"],
            warnings: ["Ensure all deductions are legitimate"],
            estimated_time: "30-60 minutes"
          },
          {
            step_number: 3,
            title: "Complete Tax Forms",
            description: "Fill out the required tax forms for your jurisdiction",
            tips: ["Read instructions carefully", "Keep copies"],
            warnings: ["Submit before deadline"],
            estimated_time: "1-2 hours"
          }
        ],
        deadlines: [
          {
            type: "Quarterly filing",
            date: "15th of month following quarter end",
            description: "Standard quarterly tax filing deadline"
          }
        ],
        common_mistakes: [
          {
            mistake: "Missing filing deadlines",
            how_to_avoid: "Set calendar reminders well in advance"
          },
          {
            mistake: "Incorrect calculations",
            how_to_avoid: "Double-check all math and consider using software"
          }
        ],
        location_specific: {
          requirements: ["Check local tax authority website"],
          benefits: ["Research available tax credits"],
          resources: ["Local tax office", "Professional tax preparers"]
        },
        next_steps: ["Keep copies of all filed documents", "Set reminders for next filing period"],
        professional_help: {
          when_needed: "Complex business structure or large tax liability",
          types: ["CPA", "Tax attorney", "Enrolled agent"]
        }
      };
    }

    // Add metadata
    filingSteps.generated_at = new Date().toISOString();
    filingSteps.business_type = businessInfo.businessType;
    filingSteps.location = `${taxSettings.city}, ${taxSettings.stateProvince}, ${taxSettings.country}`;
    filingSteps.filing_type = filingType;

    // Log usage for tracking
    console.log('[filing-steps] Generated filing steps for:', {
      location: filingSteps.location,
      businessType: businessInfo.businessType,
      filingType
    });

    return NextResponse.json(filingSteps, { 
      status: 200, 
      headers: standardSecurityHeaders 
    });
  } catch (error) {
    console.error('[filing-steps] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate filing steps' },
      { status: 500, headers: standardSecurityHeaders }
    );
  }
}