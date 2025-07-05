import { NextResponse } from 'next/server';
import { getServerUser } from '@/utils/getServerUser';

// State-specific filing requirements
const STATE_FILING_SUPPORT = {
  // Full e-filing support states
  fullSupport: [
    'CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI',
    'NJ', 'VA', 'WA', 'AZ', 'MA', 'TN', 'IN', 'MD', 'MO', 'WI'
  ],
  // Limited support (only certain forms)
  limitedSupport: [
    'MN', 'CO', 'SC', 'AL', 'LA', 'KY', 'OR', 'OK', 'CT', 'UT'
  ],
  // No income tax states (sales tax only)
  noIncomeTax: ['AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WA', 'WY']
};

// Business structure eligibility
const STRUCTURE_ELIGIBILITY = {
  soleProprietorship: {
    salesTax: true,
    payrollTax: true,
    incomeTax: true,
    forms: ['1040 Schedule C']
  },
  llc: {
    salesTax: true,
    payrollTax: true,
    incomeTax: true,
    forms: ['1065', '1120S'] // Depends on election
  },
  sCorp: {
    salesTax: true,
    payrollTax: true,
    incomeTax: true,
    forms: ['1120S']
  },
  cCorp: {
    salesTax: true,
    payrollTax: true,
    incomeTax: true,
    forms: ['1120']
  },
  partnership: {
    salesTax: true,
    payrollTax: true,
    incomeTax: true,
    forms: ['1065']
  },
  nonprofit: {
    salesTax: false, // Usually exempt
    payrollTax: true,
    incomeTax: false, // 990 not supported yet
    forms: ['990']
  }
};

export async function POST(request) {
  try {
    console.log('[api/taxes/filing/eligibility] Checking filing eligibility');
    
    // Validate authentication
    const userResult = await getServerUser(request);
    if (!userResult.isAuthenticated || !userResult.user) {
      console.error('[api/taxes/filing/eligibility] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { tenantId, taxSettings, businessInfo } = body;
    
    if (!tenantId || !businessInfo) {
      return NextResponse.json({ error: 'Missing required information' }, { status: 400 });
    }
    
    // Prepare Claude AI prompt for eligibility analysis
    const claudePrompt = `
    Analyze tax filing eligibility for this business:
    
    Business Type: ${businessInfo.type}
    Business Structure: ${businessInfo.structure || 'Not specified'}
    State: ${businessInfo.state}
    Country: ${businessInfo.country}
    
    Tax Configuration:
    - Sales Tax Rate: ${taxSettings?.taxRates?.totalSalesTaxRate || 0}%
    - Has Employees: ${taxSettings?.taxRates?.federalPayrollTaxRate > 0 ? 'Yes' : 'No'}
    - Multiple Locations: ${taxSettings?.locations?.length > 1 ? 'Yes' : 'No'}
    
    Determine eligibility for:
    1. Sales Tax Filing (state and local)
    2. Payroll Tax Filing (941, 940, W-2)
    3. Income Tax Filing (based on business structure)
    
    Consider:
    - State e-filing capabilities
    - Business structure requirements
    - Multi-state nexus if applicable
    - Any special circumstances
    
    Provide specific reasons if not eligible and next filing deadlines.
    `;
    
    // Call Claude API
    const claudeResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ai/analyze/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify({
        prompt: claudePrompt,
        context: 'tax_filing_eligibility',
        max_tokens: 1000
      })
    });
    
    let aiAnalysis = null;
    if (claudeResponse.ok) {
      const aiData = await claudeResponse.json();
      aiAnalysis = aiData.analysis;
    }
    
    // Determine eligibility based on rules + AI insights
    const state = businessInfo.state?.toUpperCase();
    const structure = businessInfo.structure?.toLowerCase().replace(/\s+/g, '');
    
    const eligibility = {
      eligible: false,
      multiState: taxSettings?.locations?.length > 1,
      taxTypes: {
        sales: {
          eligible: false,
          reason: '',
          forms: [],
          nextDeadline: null
        },
        payroll: {
          eligible: false,
          reason: '',
          forms: [],
          nextDeadline: null
        },
        income: {
          eligible: false,
          reason: '',
          forms: [],
          nextDeadline: null
        }
      },
      warnings: [],
      aiInsights: aiAnalysis
    };
    
    // Check state support
    const hasFullSupport = STATE_FILING_SUPPORT.fullSupport.includes(state);
    const hasLimitedSupport = STATE_FILING_SUPPORT.limitedSupport.includes(state);
    const isNoIncomeTaxState = STATE_FILING_SUPPORT.noIncomeTax.includes(state);
    
    // Check structure eligibility
    const structureEligible = STRUCTURE_ELIGIBILITY[structure] || null;
    
    // Sales Tax Eligibility
    if (hasFullSupport || hasLimitedSupport) {
      eligibility.taxTypes.sales.eligible = true;
      eligibility.taxTypes.sales.forms = ['State Sales Tax Return'];
      eligibility.taxTypes.sales.nextDeadline = getNextDeadline('sales', state);
      
      if (eligibility.multiState) {
        eligibility.warnings.push('Multi-state sales tax detected. Each state will be filed separately.');
      }
    } else {
      eligibility.taxTypes.sales.reason = 'State not supported for automated filing';
    }
    
    // Payroll Tax Eligibility
    if (structureEligible?.payrollTax && taxSettings?.taxRates?.federalPayrollTaxRate > 0) {
      eligibility.taxTypes.payroll.eligible = true;
      eligibility.taxTypes.payroll.forms = ['Form 941', 'Form 940', 'W-2/W-3'];
      eligibility.taxTypes.payroll.nextDeadline = getNextDeadline('payroll');
    } else if (!structureEligible?.payrollTax) {
      eligibility.taxTypes.payroll.reason = 'Business structure not eligible';
    } else {
      eligibility.taxTypes.payroll.reason = 'No payroll detected in tax configuration';
    }
    
    // Income Tax Eligibility
    if (structureEligible?.incomeTax && !isNoIncomeTaxState) {
      eligibility.taxTypes.income.eligible = true;
      eligibility.taxTypes.income.forms = structureEligible.forms;
      eligibility.taxTypes.income.nextDeadline = getNextDeadline('income', state, structure);
      
      if (structure === 'cCorp') {
        eligibility.warnings.push('C-Corporation filings are more complex and may take additional time.');
      }
    } else if (isNoIncomeTaxState) {
      eligibility.taxTypes.income.reason = 'State has no income tax';
    } else {
      eligibility.taxTypes.income.reason = 'Business structure not eligible for automated filing';
    }
    
    // Set overall eligibility
    eligibility.eligible = 
      eligibility.taxTypes.sales.eligible ||
      eligibility.taxTypes.payroll.eligible ||
      eligibility.taxTypes.income.eligible;
    
    // Add general warnings
    if (eligibility.eligible) {
      eligibility.warnings.push('All tax filings require accurate and complete information.');
      eligibility.warnings.push('You will need to provide additional documents during the filing process.');
    }
    
    return NextResponse.json({
      success: true,
      ...eligibility
    });
    
  } catch (error) {
    console.error('[api/taxes/filing/eligibility] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check filing eligibility' },
      { status: 500 }
    );
  }
}

// Helper function to calculate next filing deadline
function getNextDeadline(taxType, state = null, structure = null) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  switch (taxType) {
    case 'sales':
      // Most states have monthly filing on the 20th
      const salesDeadline = new Date(currentYear, currentMonth + 1, 20);
      if (salesDeadline < today) {
        salesDeadline.setMonth(salesDeadline.getMonth() + 1);
      }
      return salesDeadline.toISOString();
      
    case 'payroll':
      // Quarterly: April 30, July 31, October 31, January 31
      const quarterlyDeadlines = [
        new Date(currentYear, 3, 30), // April 30
        new Date(currentYear, 6, 31), // July 31
        new Date(currentYear, 9, 31), // October 31
        new Date(currentYear + 1, 0, 31) // January 31
      ];
      
      for (const deadline of quarterlyDeadlines) {
        if (deadline > today) {
          return deadline.toISOString();
        }
      }
      return quarterlyDeadlines[0].toISOString();
      
    case 'income':
      // C-Corp: March 15, Others: April 15
      const incomeDeadline = structure === 'cCorp' 
        ? new Date(currentYear + 1, 2, 15) // March 15
        : new Date(currentYear + 1, 3, 15); // April 15
        
      if (incomeDeadline < today) {
        incomeDeadline.setFullYear(incomeDeadline.getFullYear() + 1);
      }
      return incomeDeadline.toISOString();
      
    default:
      return null;
  }
}