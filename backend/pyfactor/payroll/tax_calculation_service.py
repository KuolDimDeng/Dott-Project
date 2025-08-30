"""
Enhanced payroll tax calculation service using GlobalPayrollTax data
"""
import logging
from decimal import Decimal
from django.db.models import Q
from taxes.models import GlobalPayrollTax
from users.models import Business

logger = logging.getLogger(__name__)

class PayrollTaxCalculator:
    """
    Enhanced tax calculator that uses GlobalPayrollTax table for accurate calculations
    """
    
    def __init__(self, business_id):
        """Initialize with business context to determine tax jurisdiction"""
        try:
            self.business = Business.objects.get(id=business_id)
            self.country = self.business.country or 'US'
            self.region = self.business.region or ''
            logger.info(f"Initialized PayrollTaxCalculator for {self.country}/{self.region}")
        except Business.DoesNotExist:
            logger.error(f"Business {business_id} not found, defaulting to US taxes")
            self.country = 'US'
            self.region = ''
    
    def get_tax_rates(self):
        """
        Get applicable tax rates for this business location
        """
        try:
            # First try to find region-specific rates
            if self.region:
                tax_rate = GlobalPayrollTax.objects.filter(
                    country=self.country,
                    region_code=self.region
                ).first()
                
                if tax_rate:
                    logger.info(f"Found region-specific tax rates for {self.country}/{self.region}")
                    return tax_rate
            
            # Fall back to country-level rates
            tax_rate = GlobalPayrollTax.objects.filter(
                country=self.country,
                region_code=''  # Country-level rates have empty region
            ).first()
            
            if tax_rate:
                logger.info(f"Using country-level tax rates for {self.country}")
                return tax_rate
            
            # If no rates found, log warning and return None
            logger.warning(f"No tax rates found for {self.country}/{self.region}")
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving tax rates: {str(e)}")
            return None
    
    def calculate_employee_taxes(self, gross_pay, ytd_gross=None):
        """
        Calculate taxes deducted from employee's pay
        Returns dict with individual tax amounts
        """
        if not gross_pay or gross_pay <= 0:
            return self._zero_taxes()
        
        tax_rates = self.get_tax_rates()
        if not tax_rates:
            logger.warning("Using fallback tax rates - calculations may be inaccurate")
            return self._calculate_fallback_employee_taxes(gross_pay)
        
        ytd_gross = ytd_gross or Decimal('0.00')
        
        # Calculate each tax component
        taxes = {
            'federal_income_tax': self._calculate_federal_income_tax(gross_pay, ytd_gross),
            'state_tax': self._calculate_state_tax(gross_pay, tax_rates),
            'social_security_tax': self._calculate_social_security(
                gross_pay, ytd_gross, tax_rates.employee_social_security_rate, tax_rates.social_security_wage_cap
            ),
            'medicare_tax': self._calculate_medicare(
                gross_pay, ytd_gross, tax_rates.employee_medicare_rate, tax_rates.medicare_additional_threshold
            ),
            'unemployment_tax': gross_pay * tax_rates.employee_unemployment_rate,
            'other_tax': gross_pay * tax_rates.employee_other_rate
        }
        
        # Calculate total
        taxes['total_employee_taxes'] = sum(taxes.values())
        
        logger.info(f"Calculated employee taxes: {taxes['total_employee_taxes']} on gross {gross_pay}")
        return taxes
    
    def calculate_employer_taxes(self, gross_pay, ytd_gross=None):
        """
        Calculate taxes paid by employer (not deducted from employee)
        Returns dict with individual tax amounts
        """
        if not gross_pay or gross_pay <= 0:
            return self._zero_employer_taxes()
        
        tax_rates = self.get_tax_rates()
        if not tax_rates:
            logger.warning("Using fallback employer tax rates")
            return self._calculate_fallback_employer_taxes(gross_pay)
        
        ytd_gross = ytd_gross or Decimal('0.00')
        
        # Calculate employer portion of taxes
        employer_taxes = {
            'employer_social_security': self._calculate_social_security(
                gross_pay, ytd_gross, tax_rates.employer_social_security_rate, tax_rates.social_security_wage_cap
            ),
            'employer_medicare': self._calculate_medicare(
                gross_pay, ytd_gross, tax_rates.employer_medicare_rate, tax_rates.medicare_additional_threshold
            ),
            'employer_unemployment': gross_pay * tax_rates.employer_unemployment_rate,
            'employer_other': gross_pay * tax_rates.employer_other_rate
        }
        
        employer_taxes['total_employer_taxes'] = sum(employer_taxes.values())
        
        logger.info(f"Calculated employer taxes: {employer_taxes['total_employer_taxes']} on gross {gross_pay}")
        return employer_taxes
    
    def _calculate_federal_income_tax(self, gross_pay, ytd_gross):
        """
        Calculate federal income tax using simplified brackets
        This is a basic implementation - production should use IRS tax tables
        """
        # Simplified federal tax calculation - use actual tax brackets in production
        if self.country == 'US':
            # Basic progressive tax calculation
            if gross_pay <= 500:
                return gross_pay * Decimal('0.10')  # 10% bracket
            elif gross_pay <= 2000:
                return gross_pay * Decimal('0.12')  # 12% bracket  
            else:
                return gross_pay * Decimal('0.15')  # 15% bracket
        else:
            # For non-US, return 0 or country-specific calculation
            return Decimal('0.00')
    
    def _calculate_state_tax(self, gross_pay, tax_rates):
        """
        Calculate state/regional income tax
        """
        # This would use state-specific tax tables in production
        # For now, use a simplified percentage
        if self.country == 'US':
            # States have varying rates - this is simplified
            state_rate = Decimal('0.05')  # 5% default
            return gross_pay * state_rate
        else:
            # Use regional rate from GlobalPayrollTax if available
            if hasattr(tax_rates, 'regional_income_tax_rate'):
                return gross_pay * tax_rates.regional_income_tax_rate
            return Decimal('0.00')
    
    def _calculate_social_security(self, gross_pay, ytd_gross, rate, wage_cap):
        """
        Calculate social security tax with wage cap
        """
        if not wage_cap:
            # No wage cap - apply rate to full amount
            return gross_pay * rate
        
        # Check if wage cap is exceeded
        new_ytd = ytd_gross + gross_pay
        
        if ytd_gross >= wage_cap:
            # Already exceeded cap
            return Decimal('0.00')
        elif new_ytd > wage_cap:
            # Will exceed cap this period
            taxable_amount = wage_cap - ytd_gross
            return taxable_amount * rate
        else:
            # Under cap
            return gross_pay * rate
    
    def _calculate_medicare(self, gross_pay, ytd_gross, base_rate, additional_threshold):
        """
        Calculate Medicare tax with additional high earner tax
        """
        base_medicare = gross_pay * base_rate
        
        if not additional_threshold:
            return base_medicare
        
        # Check for additional Medicare tax (US only)
        if self.country == 'US':
            new_ytd = ytd_gross + gross_pay
            
            if ytd_gross >= additional_threshold:
                # Already in additional tax bracket
                additional_medicare = gross_pay * Decimal('0.009')  # 0.9% additional
            elif new_ytd > additional_threshold:
                # Will enter additional tax bracket
                taxable_amount = new_ytd - additional_threshold
                additional_medicare = taxable_amount * Decimal('0.009')
            else:
                additional_medicare = Decimal('0.00')
            
            return base_medicare + additional_medicare
        
        return base_medicare
    
    def _calculate_fallback_employee_taxes(self, gross_pay):
        """Fallback tax calculation when no tax data is available"""
        if self.country == 'US':
            return {
                'federal_income_tax': gross_pay * Decimal('0.12'),
                'state_tax': gross_pay * Decimal('0.05'),
                'social_security_tax': gross_pay * Decimal('0.062'),
                'medicare_tax': gross_pay * Decimal('0.0145'),
                'unemployment_tax': Decimal('0.00'),
                'other_tax': Decimal('0.00'),
                'total_employee_taxes': gross_pay * Decimal('0.1965')
            }
        else:
            # International fallback - conservative estimate
            return {
                'federal_income_tax': gross_pay * Decimal('0.15'),
                'state_tax': gross_pay * Decimal('0.03'),
                'social_security_tax': gross_pay * Decimal('0.05'),
                'medicare_tax': gross_pay * Decimal('0.02'),
                'unemployment_tax': Decimal('0.00'),
                'other_tax': Decimal('0.00'),
                'total_employee_taxes': gross_pay * Decimal('0.25')
            }
    
    def _calculate_fallback_employer_taxes(self, gross_pay):
        """Fallback employer tax calculation"""
        if self.country == 'US':
            return {
                'employer_social_security': gross_pay * Decimal('0.062'),
                'employer_medicare': gross_pay * Decimal('0.0145'),
                'employer_unemployment': gross_pay * Decimal('0.006'),
                'employer_other': Decimal('0.00'),
                'total_employer_taxes': gross_pay * Decimal('0.0825')
            }
        else:
            return {
                'employer_social_security': gross_pay * Decimal('0.05'),
                'employer_medicare': gross_pay * Decimal('0.02'),
                'employer_unemployment': gross_pay * Decimal('0.01'),
                'employer_other': Decimal('0.00'),
                'total_employer_taxes': gross_pay * Decimal('0.08')
            }
    
    def _zero_taxes(self):
        """Return zero tax structure"""
        return {
            'federal_income_tax': Decimal('0.00'),
            'state_tax': Decimal('0.00'),
            'social_security_tax': Decimal('0.00'),
            'medicare_tax': Decimal('0.00'),
            'unemployment_tax': Decimal('0.00'),
            'other_tax': Decimal('0.00'),
            'total_employee_taxes': Decimal('0.00')
        }
    
    def _zero_employer_taxes(self):
        """Return zero employer tax structure"""
        return {
            'employer_social_security': Decimal('0.00'),
            'employer_medicare': Decimal('0.00'),
            'employer_unemployment': Decimal('0.00'),
            'employer_other': Decimal('0.00'),
            'total_employer_taxes': Decimal('0.00')
        }
    
    def get_tax_summary(self, gross_pay, ytd_gross=None):
        """
        Get complete tax summary for payroll display
        """
        employee_taxes = self.calculate_employee_taxes(gross_pay, ytd_gross)
        employer_taxes = self.calculate_employer_taxes(gross_pay, ytd_gross)
        
        net_pay = gross_pay - employee_taxes['total_employee_taxes']
        total_cost = gross_pay + employer_taxes['total_employer_taxes']
        
        return {
            'gross_pay': gross_pay,
            'employee_taxes': employee_taxes,
            'employer_taxes': employer_taxes,
            'net_pay': net_pay,
            'total_employer_cost': total_cost,
            'country': self.country,
            'region': self.region
        }