from decimal import Decimal
from typing import Dict, List
import logging

try:
    from taxes.models import TenantTaxSettings
except ImportError:
    TenantTaxSettings = None

logger = logging.getLogger(__name__)


class PayrollFeeCalculator:
    """
    Calculates payroll fees including the 2.4% processing fee on tax payments
    """
    
    PROCESSING_FEE_RATE = Decimal('0.024')  # 2.4%
    DIRECT_DEPOSIT_FEE = Decimal('2.00')    # $2 per employee
    
    def __init__(self, tenant=None):
        self.tenant = tenant
    
    def calculate_payroll_with_fees(self, country_code: str, gross_salary: Decimal, 
                                   state_code: str = None) -> Dict:
        """
        Calculate complete payroll breakdown including taxes and fees
        
        Returns:
            Dictionary containing all payroll components and fees
        """
        # Get tax rates
        tax_rates = self._get_tax_rates(country_code, state_code)
        
        # Calculate employee taxes (withheld from salary)
        employee_tax = gross_salary * (tax_rates['employee_rate'] / 100)
        employee_social_security = gross_salary * (tax_rates['employee_social_security_rate'] / 100)
        employee_medicare = gross_salary * (tax_rates['employee_medicare_rate'] / 100)
        total_employee_tax = employee_tax + employee_social_security + employee_medicare
        
        # Calculate employer taxes (additional cost to employer)
        employer_tax = gross_salary * (tax_rates['employer_rate'] / 100)
        employer_social_security = gross_salary * (tax_rates['employer_social_security_rate'] / 100)
        employer_medicare = gross_salary * (tax_rates['employer_medicare_rate'] / 100)
        total_employer_tax = employer_tax + employer_social_security + employer_medicare
        
        # Total tax amount (for fee calculation)
        total_tax = total_employee_tax + total_employer_tax
        
        # Calculate fees
        processing_fee = total_tax * self.PROCESSING_FEE_RATE
        direct_deposit_fee = self.DIRECT_DEPOSIT_FEE
        
        # Calculate totals
        net_salary = gross_salary - total_employee_tax
        employer_total_cost = gross_salary + total_employer_tax + processing_fee + direct_deposit_fee
        
        return {
            'gross_salary': gross_salary,
            'employee_tax': employee_tax,
            'employee_social_security': employee_social_security,
            'employee_medicare': employee_medicare,
            'total_employee_tax': total_employee_tax,
            'employer_tax': employer_tax,
            'employer_social_security': employer_social_security,
            'employer_medicare': employer_medicare,
            'total_employer_tax': total_employer_tax,
            'total_tax': total_tax,
            'net_salary': net_salary,
            'processing_fee': processing_fee,
            'direct_deposit_fee': direct_deposit_fee,
            'employer_total_payment': employer_total_cost,
            'employee_receives': net_salary,
            'government_receives': total_tax,
            'dott_revenue': processing_fee + direct_deposit_fee
        }
    
    def calculate_bulk_payroll(self, employees: List[Dict]) -> Dict:
        """
        Calculate payroll for multiple employees
        
        Args:
            employees: List of dicts with employee_id, gross_salary, country_code, state_code
            
        Returns:
            Complete payroll summary with individual and aggregate calculations
        """
        results = {
            'employees': [],
            'summary': {
                'total_gross': Decimal('0'),
                'total_employee_tax': Decimal('0'),
                'total_employer_tax': Decimal('0'),
                'total_net_pay': Decimal('0'),
                'total_processing_fee': Decimal('0'),
                'total_direct_deposit_fees': Decimal('0'),
                'employer_total_payment': Decimal('0'),
                'government_receives': Decimal('0'),
                'employees_receive': Decimal('0'),
                'dott_revenue': Decimal('0')
            }
        }
        
        for employee in employees:
            calc = self.calculate_payroll_with_fees(
                country_code=employee.get('country_code', 'US'),
                gross_salary=Decimal(str(employee['gross_salary'])),
                state_code=employee.get('state_code')
            )
            
            # Add to individual results
            results['employees'].append({
                'employee_id': employee['employee_id'],
                'calculation': calc
            })
            
            # Update summary
            summary = results['summary']
            summary['total_gross'] += calc['gross_salary']
            summary['total_employee_tax'] += calc['total_employee_tax']
            summary['total_employer_tax'] += calc['total_employer_tax']
            summary['total_net_pay'] += calc['net_salary']
            summary['total_processing_fee'] += calc['processing_fee']
            summary['total_direct_deposit_fees'] += calc['direct_deposit_fee']
        
        # Calculate final totals
        summary = results['summary']
        summary['employer_total_payment'] = (
            summary['total_gross'] + 
            summary['total_employer_tax'] + 
            summary['total_processing_fee'] + 
            summary['total_direct_deposit_fees']
        )
        summary['government_receives'] = (
            summary['total_employee_tax'] + 
            summary['total_employer_tax']
        )
        summary['employees_receive'] = summary['total_net_pay']
        summary['dott_revenue'] = (
            summary['total_processing_fee'] + 
            summary['total_direct_deposit_fees']
        )
        
        return results
    
    def _get_tax_rates(self, country_code: str, state_code: str = None) -> Dict:
        """
        Get tax rates from GlobalPayrollTax, with tenant overrides if applicable
        """
        # Default rates (US federal as fallback)
        rates = {
            'employee_rate': Decimal('22.0'),  # Federal income tax
            'employer_rate': Decimal('0'),
            'employee_social_security_rate': Decimal('6.2'),
            'employer_social_security_rate': Decimal('6.2'),
            'employee_medicare_rate': Decimal('1.45'),
            'employer_medicare_rate': Decimal('1.45'),
        }
        
        # GlobalPayrollTax model not available yet - using defaults
        # TODO: Uncomment when GlobalPayrollTax model is implemented
        # # Get global rates
        # if country_code == 'US' and state_code:
        #     payroll_tax = GlobalPayrollTax.objects.filter(
        #         country=country_code,
        #         region_code=state_code
        #     ).first()
        # else:
        #     payroll_tax = GlobalPayrollTax.objects.filter(
        #         country=country_code,
        #         region_code__isnull=True
        #     ).first()
        # 
        # if payroll_tax:
        #     # Use the specific rates from the database
        #     rates['employee_social_security_rate'] = payroll_tax.employee_social_security_rate * 100
        #     rates['employer_social_security_rate'] = payroll_tax.employer_social_security_rate * 100
        #     rates['employee_medicare_rate'] = payroll_tax.employee_medicare_rate * 100
        #     rates['employer_medicare_rate'] = payroll_tax.employer_medicare_rate * 100
            
        #     # Add other taxes to the general rate
        #     employee_other = (payroll_tax.employee_unemployment_rate + payroll_tax.employee_other_rate) * 100
        #     employer_other = (payroll_tax.employer_unemployment_rate + payroll_tax.employer_other_rate) * 100
        #     
        #     rates['employee_rate'] = employee_other
        #     rates['employer_rate'] = employer_other
        
        # Apply tenant overrides if available
        if self.tenant and TenantTaxSettings:
            try:
                tenant_settings = TenantTaxSettings.objects.filter(tenant=self.tenant).first()
                if tenant_settings:
                    if hasattr(tenant_settings, 'payroll_employee_rate') and tenant_settings.payroll_employee_rate is not None:
                        rates['employee_rate'] = tenant_settings.payroll_employee_rate
                    if hasattr(tenant_settings, 'payroll_employer_rate') and tenant_settings.payroll_employer_rate is not None:
                        rates['employer_rate'] = tenant_settings.payroll_employer_rate
            except Exception as e:
                logger.warning(f"Error getting tenant tax settings: {e}")
        
        return rates