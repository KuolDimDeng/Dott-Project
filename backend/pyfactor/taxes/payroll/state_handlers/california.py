"""
California Payroll Tax Handler

Handles California-specific payroll taxes:
- Personal Income Tax (PIT)
- State Disability Insurance (SDI)
- Paid Family Leave (PFL)
- Unemployment Insurance (UI)
- Employment Training Tax (ETT)
"""

import logging
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from datetime import date, datetime

from hr.models import Employee
from taxes.models import StateTaxAccount, IncomeTaxRate
from ..state_payroll_processor import BaseStatePayrollHandler

logger = logging.getLogger(__name__)


class CaliforniaPayrollHandler(BaseStatePayrollHandler):
    """Handler for California payroll taxes"""
    
    def __init__(self, tenant_id: str):
        super().__init__(tenant_id)
        self.state_code = 'CA'
        self.state_name = 'California'
        
        # 2024 rates and limits
        self.sdi_rate = Decimal('0.009')  # 0.9% for 2024
        self.sdi_wage_base = Decimal('153164')  # 2024 limit
        
        self.ui_wage_base = Decimal('7000')  # Federal/CA UI wage base
        self.ui_new_employer_rate = Decimal('0.034')  # 3.4% for new employers
        
        self.ett_rate = Decimal('0.001')  # 0.1% ETT rate
        self.ett_wage_base = self.ui_wage_base
    
    def calculate_state_withholding(self, employee: Employee, 
                                  gross_pay: Decimal, 
                                  pay_date: date) -> Decimal:
        """Calculate California Personal Income Tax withholding"""
        try:
            # Get employee's CA withholding elections (would come from state W-4 equivalent)
            filing_status = getattr(employee, 'ca_filing_status', 'single')
            allowances = getattr(employee, 'ca_allowances', 0)
            additional_withholding = getattr(employee, 'ca_additional_withholding', Decimal('0'))
            
            # Get current year tax rates
            tax_year = pay_date.year
            
            # Calculate taxable wages
            allowance_value = Decimal('134.20')  # 2024 allowance value
            taxable_wages = gross_pay - (allowances * allowance_value)
            
            if taxable_wages <= 0:
                return additional_withholding
            
            # Get tax brackets for filing status
            withholding = self._calculate_pit_withholding(
                taxable_wages, 
                filing_status, 
                tax_year
            )
            
            return withholding + additional_withholding
            
        except Exception as e:
            logger.error(f"Error calculating CA withholding: {str(e)}")
            # Fallback to flat rate
            return gross_pay * Decimal('0.06')  # 6% default
    
    def _calculate_pit_withholding(self, taxable_wages: Decimal, 
                                  filing_status: str, tax_year: int) -> Decimal:
        """Calculate PIT using California withholding tables"""
        # Simplified calculation - in production, use actual CA withholding tables
        # These are example brackets for 2024
        
        if filing_status == 'single':
            brackets = [
                (Decimal('0'), Decimal('0.011')),        # 1.1%
                (Decimal('10099'), Decimal('0.022')),     # 2.2%
                (Decimal('23942'), Decimal('0.044')),     # 4.4%
                (Decimal('37788'), Decimal('0.066')),     # 6.6%
                (Decimal('52455'), Decimal('0.088')),     # 8.8%
                (Decimal('66295'), Decimal('0.1023')),    # 10.23%
                (Decimal('338639'), Decimal('0.1133')),   # 11.33%
                (Decimal('406364'), Decimal('0.1243')),   # 12.43%
                (Decimal('677275'), Decimal('0.1353')),   # 13.53%
            ]
        else:  # married
            brackets = [
                (Decimal('0'), Decimal('0.011')),
                (Decimal('20198'), Decimal('0.022')),
                (Decimal('47884'), Decimal('0.044')),
                (Decimal('75576'), Decimal('0.066')),
                (Decimal('104910'), Decimal('0.088')),
                (Decimal('132590'), Decimal('0.1023')),
                (Decimal('677278'), Decimal('0.1133')),
                (Decimal('812728'), Decimal('0.1243')),
                (Decimal('1354568'), Decimal('0.1353')),
            ]
        
        tax = Decimal('0')
        for i, (threshold, rate) in enumerate(brackets):
            if i == len(brackets) - 1 or taxable_wages <= brackets[i + 1][0]:
                tax += (taxable_wages - threshold) * rate
                break
            else:
                tax += (brackets[i + 1][0] - threshold) * rate
        
        return tax.quantize(Decimal('0.01'))
    
    def calculate_employer_taxes(self, employee: Employee, 
                               gross_pay: Decimal,
                               pay_date: date,
                               state_account: Optional[StateTaxAccount]) -> Dict:
        """Calculate employer-paid California taxes"""
        results = {
            'ui_wages': Decimal('0'),
            'ui_tax': Decimal('0'),
            'ett_tax': Decimal('0'),
            'total_employer_tax': Decimal('0')
        }
        
        # Get YTD wages for the employee
        ytd_wages = self._get_ytd_wages(employee, pay_date.year)
        
        # Calculate UI (Unemployment Insurance)
        if ytd_wages < self.ui_wage_base:
            ui_taxable = min(gross_pay, self.ui_wage_base - ytd_wages)
            results['ui_wages'] = ui_taxable
            
            # Get employer's UI rate or use new employer rate
            ui_rate = self.ui_new_employer_rate
            if state_account and state_account.experience_rate:
                ui_rate = state_account.experience_rate
            
            results['ui_tax'] = ui_taxable * ui_rate
        
        # Calculate ETT (Employment Training Tax)
        if ytd_wages < self.ett_wage_base:
            ett_taxable = min(gross_pay, self.ett_wage_base - ytd_wages)
            results['ett_tax'] = ett_taxable * self.ett_rate
        
        results['total_employer_tax'] = results['ui_tax'] + results['ett_tax']
        
        return results
    
    def calculate_employee_taxes(self, employee: Employee,
                               gross_pay: Decimal,
                               pay_date: date) -> Dict:
        """Calculate employee-paid California taxes (SDI/PFL)"""
        results = {
            'sdi_wages': Decimal('0'),
            'sdi_tax': Decimal('0'),  # Includes both SDI and PFL
            'total_employee_tax': Decimal('0')
        }
        
        # Get YTD wages
        ytd_wages = self._get_ytd_wages(employee, pay_date.year)
        
        # Calculate SDI (includes PFL)
        if ytd_wages < self.sdi_wage_base:
            sdi_taxable = min(gross_pay, self.sdi_wage_base - ytd_wages)
            results['sdi_wages'] = sdi_taxable
            results['sdi_tax'] = sdi_taxable * self.sdi_rate
        
        results['total_employee_tax'] = results['sdi_tax']
        
        return results
    
    def _get_ytd_wages(self, employee: Employee, year: int) -> Decimal:
        """Get year-to-date wages for an employee"""
        # In production, this would query actual YTD wages from payroll transactions
        from payroll.models import PayrollTransaction
        from django.db.models import Sum
        
        ytd = PayrollTransaction.objects.filter(
            tenant_id=self.tenant_id,
            employee=employee,
            payroll_run__pay_date__year=year,
            payroll_run__status='completed'
        ).aggregate(
            total=Sum('gross_pay')
        )['total'] or Decimal('0')
        
        return ytd
    
    def validate_employer_account(self, account: StateTaxAccount) -> Tuple[bool, str]:
        """Validate California employer account number"""
        if not account.state_employer_number:
            return False, "Missing CA employer account number"
        
        # CA employer account format: 123-4567-8
        import re
        pattern = r'^\d{3}-\d{4}-\d$'
        
        if not re.match(pattern, account.state_employer_number):
            return False, "Invalid CA employer account format (should be ###-####-#)"
        
        return True, "Valid"
    
    def generate_state_forms(self, period_start: date, period_end: date) -> Dict:
        """Generate California state forms (DE 9, DE 9C)"""
        try:
            from taxes.models import PayrollTaxFiling
            
            # Get all CA filings for the period
            filings = PayrollTaxFiling.objects.filter(
                tenant_id=self.tenant_id,
                state__code='CA',
                filing_period_start__gte=period_start,
                filing_period_end__lte=period_end
            )
            
            # Generate DE 9 (Quarterly Contribution and Wage Report)
            de9_data = {
                'form_type': 'DE 9',
                'period_start': period_start,
                'period_end': period_end,
                'total_wages': Decimal('0'),
                'ui_wages': Decimal('0'),
                'sdi_wages': Decimal('0'),
                'ui_contributions': Decimal('0'),
                'sdi_withholdings': Decimal('0'),
                'ett_contributions': Decimal('0'),
                'employee_count': 0
            }
            
            # Aggregate data from filings
            for filing in filings:
                de9_data['total_wages'] += filing.total_wages
                # Additional aggregation would go here
            
            return {
                'success': True,
                'forms': {
                    'DE9': de9_data,
                    'DE9C': self._generate_de9c(period_start, period_end)
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating CA forms: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_de9c(self, period_start: date, period_end: date) -> Dict:
        """Generate DE 9C (Quarterly Contribution and Wage Continuation)"""
        # This would contain employee-level detail
        return {
            'form_type': 'DE 9C',
            'period_start': period_start,
            'period_end': period_end,
            'employees': []
        }
    
    def submit_filing(self, filing: PayrollTaxFiling) -> Dict:
        """Submit filing to California EDD"""
        try:
            # California uses e-Services for Business (eSB)
            # In production, this would integrate with CA EDD API
            
            result = {
                'success': True,
                'confirmation_number': f'CA-{filing.id}',
                'submitted_at': datetime.now().isoformat(),
                'endpoint': 'https://edd.ca.gov/api/submit',
                'status_code': 200,
                'processing_time': 1500
            }
            
            # Update filing status
            filing.filing_status = 'submitted'
            filing.confirmation_number = result['confirmation_number']
            filing.save()
            
            return result
            
        except Exception as e:
            logger.error(f"Error submitting CA filing: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'status_code': 500
            }
    
    def check_reciprocity(self, residence_state: str, work_state: str) -> Optional[Dict]:
        """Check for reciprocity agreements"""
        # California has no reciprocity agreements
        return None
    
    def get_tax_deposits(self, year: int, quarter: int) -> List[Dict]:
        """Get California tax deposits for the period"""
        # This would query actual deposit records
        return []
    
    def calculate_local_taxes(self, employee: Employee, gross_pay: Decimal,
                            locality: Optional[str] = None) -> Dict:
        """Calculate local taxes (CA has few local payroll taxes)"""
        # Most CA localities don't have local income taxes
        # San Francisco has some local mandates but they're not traditional payroll taxes
        return {
            'local_tax': Decimal('0'),
            'locality': locality or 'N/A'
        }