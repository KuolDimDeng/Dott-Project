import { NextResponse } from 'next/server';
import { getServerUser } from '@/utils/getServerUser';

// Tax validation rules by jurisdiction
const VALIDATION_RULES = {
  US: {
    salesTax: { min: 0, max: 15, warning: 10 },
    corporateTax: { min: 0, max: 40, warning: 30 },
    payrollTax: { min: 0, max: 30, warning: 25 }
  },
  CA: {
    salesTax: { min: 0, max: 20, warning: 15 },
    corporateTax: { min: 0, max: 35, warning: 28 },
    payrollTax: { min: 0, max: 35, warning: 30 }
  },
  default: {
    salesTax: { min: 0, max: 25, warning: 20 },
    corporateTax: { min: 0, max: 45, warning: 35 },
    payrollTax: { min: 0, max: 40, warning: 35 }
  }
};

// Industry-specific compliance requirements
const INDUSTRY_COMPLIANCE = {
  restaurant: {
    requiredTaxes: ['salesTax', 'foodBeverageTax'],
    licenses: ['Food Service License', 'Health Permit'],
    specialConsiderations: ['Tips reporting', 'Alcohol tax if applicable']
  },
  retail: {
    requiredTaxes: ['salesTax'],
    exemptions: ['Groceries', 'Prescription drugs'],
    specialConsiderations: ['Inventory tax', 'Use tax obligations']
  },
  ecommerce: {
    requiredTaxes: ['salesTax'],
    specialConsiderations: ['Economic nexus', 'Marketplace facilitator laws', 'Digital goods taxation']
  },
  manufacturing: {
    requiredTaxes: ['salesTax', 'exciseTax'],
    exemptions: ['Raw materials', 'Manufacturing equipment'],
    specialConsiderations: ['Environmental fees', 'Export exemptions']
  },
  service: {
    requiredTaxes: ['salesTax'],
    specialConsiderations: ['Professional services exemptions', 'Labor vs materials split']
  }
};

export async function POST(request) {
  try {
    console.log('[api/taxes/validate] Validating tax configuration');
    
    // Validate authentication
    const userResult = await getServerUser(request);
    if (!userResult.isAuthenticated || !userResult.user) {
      console.error('[api/taxes/validate] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { taxRates, businessInfo, locations } = body;
    
    const errors = [];
    const warnings = [];
    const recommendations = [];
    
    // Determine country code for validation rules
    const countryCode = businessInfo?.country?.substring(0, 2).toUpperCase() || 'US';
    const rules = VALIDATION_RULES[countryCode] || VALIDATION_RULES.default;
    
    // Validate sales tax
    const totalSalesTax = parseFloat(taxRates?.totalSalesTaxRate) || 0;
    if (totalSalesTax > rules.salesTax.max) {
      errors.push({
        field: 'totalSalesTaxRate',
        message: `Total sales tax rate (${totalSalesTax}%) exceeds maximum allowed (${rules.salesTax.max}%)`
      });
    } else if (totalSalesTax > rules.salesTax.warning) {
      warnings.push({
        field: 'totalSalesTaxRate',
        message: `Total sales tax rate (${totalSalesTax}%) is unusually high. Please verify this is correct.`
      });
    }
    
    // Validate corporate tax
    const corporateTax = parseFloat(taxRates?.corporateIncomeTaxRate) || 0;
    if (corporateTax > rules.corporateTax.max) {
      errors.push({
        field: 'corporateIncomeTaxRate',
        message: `Corporate tax rate (${corporateTax}%) exceeds maximum allowed (${rules.corporateTax.max}%)`
      });
    } else if (corporateTax > rules.corporateTax.warning) {
      warnings.push({
        field: 'corporateIncomeTaxRate',
        message: `Corporate tax rate (${corporateTax}%) is unusually high. Please verify this is correct.`
      });
    }
    
    // Validate payroll taxes
    const totalPayrollTax = (parseFloat(taxRates?.federalPayrollTaxRate) || 0) + 
                           (parseFloat(taxRates?.statePayrollTaxRate) || 0);
    if (totalPayrollTax > rules.payrollTax.max) {
      errors.push({
        field: 'payrollTax',
        message: `Combined payroll tax rate (${totalPayrollTax}%) exceeds maximum allowed (${rules.payrollTax.max}%)`
      });
    } else if (totalPayrollTax > rules.payrollTax.warning) {
      warnings.push({
        field: 'payrollTax',
        message: `Combined payroll tax rate (${totalPayrollTax}%) is unusually high. Please verify these rates.`
      });
    }
    
    // Validate progressive tax brackets
    if (taxRates?.hasProgressiveTax && taxRates?.personalIncomeTaxBrackets) {
      const brackets = taxRates.personalIncomeTaxBrackets;
      
      // Check for bracket overlaps
      for (let i = 1; i < brackets.length; i++) {
        const prevMax = parseFloat(brackets[i-1].maxIncome) || 0;
        const currMin = parseFloat(brackets[i].minIncome) || 0;
        
        if (currMin <= prevMax) {
          errors.push({
            field: `bracket_${i}`,
            message: `Tax bracket ${i + 1} overlaps with bracket ${i}`
          });
        }
      }
      
      // Check for missing required fields
      brackets.forEach((bracket, idx) => {
        if (!bracket.minIncome || !bracket.rate) {
          errors.push({
            field: `bracket_${idx}`,
            message: `Tax bracket ${idx + 1} is missing required fields`
          });
        }
      });
    }
    
    // Industry-specific compliance checks
    const businessType = businessInfo?.businessType;
    if (businessType && INDUSTRY_COMPLIANCE[businessType]) {
      const compliance = INDUSTRY_COMPLIANCE[businessType];
      
      // Add industry-specific recommendations
      if (compliance.requiredTaxes) {
        recommendations.push({
          type: 'industry',
          message: `As a ${businessType} business, ensure you're collecting: ${compliance.requiredTaxes.join(', ')}`
        });
      }
      
      if (compliance.licenses) {
        recommendations.push({
          type: 'licensing',
          message: `Required licenses for ${businessType}: ${compliance.licenses.join(', ')}`
        });
      }
      
      if (compliance.specialConsiderations) {
        compliance.specialConsiderations.forEach(consideration => {
          recommendations.push({
            type: 'compliance',
            message: consideration
          });
        });
      }
    }
    
    // Multi-location validation
    if (locations && locations.length > 0) {
      recommendations.push({
        type: 'multi-location',
        message: `You have ${locations.length} locations configured. Ensure each location's tax rates comply with local regulations.`
      });
    }
    
    // Filing deadline reminders
    if (taxRates?.filingDeadlines) {
      const deadlines = taxRates.filingDeadlines;
      if (!deadlines.salesTax) {
        warnings.push({
          field: 'filingDeadlines',
          message: 'Sales tax filing deadline not specified'
        });
      }
      if (!deadlines.payrollTax) {
        warnings.push({
          field: 'filingDeadlines',
          message: 'Payroll tax filing deadline not specified'
        });
      }
    }
    
    const isValid = errors.length === 0;
    
    return NextResponse.json({
      success: true,
      valid: isValid,
      errors,
      warnings,
      recommendations,
      summary: {
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        totalRecommendations: recommendations.length
      }
    });
    
  } catch (error) {
    console.error('[api/taxes/validate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to validate tax configuration' },
      { status: 500 }
    );
  }
}