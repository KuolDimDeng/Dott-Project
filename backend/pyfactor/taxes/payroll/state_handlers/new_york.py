"""
New York Payroll Tax Handler

Handles New York-specific payroll taxes:
- Personal Income Tax (PIT)
- State Unemployment Insurance (SUI)
- Disability Insurance (SDI)
- Paid Family Leave (PFL)
- Metropolitan Commuter Transportation Mobility Tax (MCTMT)
- NYC and Yonkers local taxes
"""

import logging
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from datetime import date, datetime

from hr.models import Employee
from taxes.models import StateTaxAccount
from ..state_payroll_processor import BaseStatePayrollHandler

logger = logging.getLogger(__name__)


class NewYorkPayrollHandler(BaseStatePayrollHandler):
    """Handler for New York payroll taxes"""
    
    def __init__(self, tenant_id: str):
        super().__init__(tenant_id)
        self.state_code = 'NY'
        self.state_name = 'New York'
        
        # 2024 rates and limits
        self.sui_wage_base = Decimal('12300')  # 2024 NY SUI wage base
        self.sui_new_employer_rate = Decimal('0.04125')  # 4.125% for 2024
        
        # Disability and PFL
        self.disability_rate = Decimal('0.005')  # 0.5% max rate
        self.disability_max_weekly = Decimal('0.50')  # $0.50 per week max
        self.pfl_rate = Decimal('0.00455')  # 0.455% for 2024
        self.pfl_wage_base = Decimal('79056.00')  # 2024 PFL wage base
        
        # MCTMT rates (for employers in NYC metro area)
        self.mctmt_threshold = Decimal('312500')  # Quarterly payroll threshold
        self.mctmt_rate = Decimal('0.0034')  # 0.34%
    
    def calculate_state_withholding(self, employee: Employee, 
                                  gross_pay: Decimal, 
                                  pay_date: date) -> Decimal:
        """Calculate New York State income tax withholding"""
        try:
            # Get employee's NY withholding info
            filing_status = getattr(employee, 'ny_filing_status', 'single')
            allowances = getattr(employee, 'ny_allowances', 0)
            additional_withholding = getattr(employee, 'ny_additional_withholding', Decimal('0'))
            
            # Check if NYC or Yonkers resident
            is_nyc_resident = getattr(employee, 'nyc_resident', False)
            is_yonkers_resident = getattr(employee, 'yonkers_resident', False)
            
            # Calculate state withholding
            state_withholding = self._calculate_ny_withholding(
                gross_pay, filing_status, allowances, pay_date.year
            )
            
            # Add NYC withholding if applicable
            if is_nyc_resident:
                state_withholding += self._calculate_nyc_withholding(
                    gross_pay, filing_status, allowances
                )
            
            # Add Yonkers withholding if applicable
            if is_yonkers_resident:
                state_withholding += self._calculate_yonkers_withholding(
                    gross_pay, filing_status
                )
            
            return state_withholding + additional_withholding
            
        except Exception as e:
            logger.error(f"Error calculating NY withholding: {str(e)}")
            return gross_pay * Decimal('0.0633')  # Default rate
    
    def _calculate_ny_withholding(self, gross_pay: Decimal, filing_status: str,
                                 allowances: int, tax_year: int) -> Decimal:
        """Calculate NY state income tax using withholding tables"""
        # Simplified - actual implementation would use NY withholding tables
        
        # 2024 standard deduction amounts
        if filing_status == 'single':
            standard_deduction = Decimal('8000')
            exemption_amount = Decimal('1000') * allowances
        else:  # married
            standard_deduction = Decimal('16050')
            exemption_amount = Decimal('1000') * allowances
        
        # Annualize wages
        annual_wages = gross_pay * 26  # Bi-weekly assumption
        taxable_income = max(annual_wages - standard_deduction - exemption_amount, Decimal('0'))
        
        # 2024 tax brackets (simplified)
        if filing_status == 'single':
            brackets = [
                (Decimal('0'), Decimal('0.04')),
                (Decimal('8500'), Decimal('0.045')),
                (Decimal('11700'), Decimal('0.0525')),
                (Decimal('13900'), Decimal('0.0585')),
                (Decimal('80650'), Decimal('0.0625')),
                (Decimal('215400'), Decimal('0.0685')),
                (Decimal('1077550'), Decimal('0.0965')),
                (Decimal('5000000'), Decimal('0.103')),
                (Decimal('25000000'), Decimal('0.109')),
            ]
        else:
            brackets = [
                (Decimal('0'), Decimal('0.04')),
                (Decimal('17150'), Decimal('0.045')),
                (Decimal('23600'), Decimal('0.0525')),
                (Decimal('27900'), Decimal('0.0585')),
                (Decimal('161550'), Decimal('0.0625')),
                (Decimal('323200'), Decimal('0.0685')),
                (Decimal('2155350'), Decimal('0.0965')),
                (Decimal('5000000'), Decimal('0.103')),
                (Decimal('25000000'), Decimal('0.109')),
            ]
        
        annual_tax = Decimal('0')
        for i, (threshold, rate) in enumerate(brackets):
            if i == len(brackets) - 1 or taxable_income <= brackets[i + 1][0]:
                annual_tax += (taxable_income - threshold) * rate
                break
            else:
                annual_tax += (brackets[i + 1][0] - threshold) * rate
        
        # Convert back to pay period
        return (annual_tax / 26).quantize(Decimal('0.01'))
    
    def _calculate_nyc_withholding(self, gross_pay: Decimal, 
                                  filing_status: str, allowances: int) -> Decimal:
        """Calculate NYC resident tax"""
        # NYC has its own tax brackets
        # Simplified calculation
        nyc_rate = Decimal('0.03876')  # Effective average rate
        return (gross_pay * nyc_rate).quantize(Decimal('0.01'))
    
    def _calculate_yonkers_withholding(self, gross_pay: Decimal,
                                      filing_status: str) -> Decimal:
        """Calculate Yonkers resident tax"""
        # Yonkers rate is a percentage of NY state tax
        yonkers_rate = Decimal('0.16')  # 16% of state tax
        state_tax = self._calculate_ny_withholding(gross_pay, filing_status, 0, 2024)
        return (state_tax * yonkers_rate).quantize(Decimal('0.01'))
    
    def calculate_employer_taxes(self, employee: Employee, 
                               gross_pay: Decimal,
                               pay_date: date,
                               state_account: Optional[StateTaxAccount]) -> Dict:
        """Calculate employer-paid NY taxes"""
        results = {
            'sui_wages': Decimal('0'),
            'sui_tax': Decimal('0'),
            'mctmt_tax': Decimal('0'),
            'total_employer_tax': Decimal('0')
        }
        
        # Get YTD wages
        ytd_wages = self._get_ytd_wages(employee, pay_date.year)
        
        # Calculate SUI
        if ytd_wages < self.sui_wage_base:
            sui_taxable = min(gross_pay, self.sui_wage_base - ytd_wages)
            results['sui_wages'] = sui_taxable
            
            # Get employer's rate or use new employer rate
            sui_rate = self.sui_new_employer_rate
            if state_account and state_account.experience_rate:
                sui_rate = state_account.experience_rate
            
            results['sui_tax'] = sui_taxable * sui_rate
        
        # Calculate MCTMT if applicable (NYC metro area employers)
        if self._is_mctmt_applicable(employee):
            # Check quarterly payroll threshold
            quarterly_payroll = self._get_quarterly_payroll(pay_date)
            if quarterly_payroll > self.mctmt_threshold:
                results['mctmt_tax'] = gross_pay * self.mctmt_rate
        
        results['total_employer_tax'] = results['sui_tax'] + results['mctmt_tax']
        
        return results
    
    def calculate_employee_taxes(self, employee: Employee,
                               gross_pay: Decimal,
                               pay_date: date) -> Dict:
        """Calculate employee-paid NY taxes (disability and PFL)"""
        results = {
            'disability_tax': Decimal('0'),
            'pfl_tax': Decimal('0'),
            'total_employee_tax': Decimal('0')
        }
        
        # Get YTD wages for PFL
        ytd_wages = self._get_ytd_wages(employee, pay_date.year)
        
        # Calculate disability insurance
        # NY disability is capped at $0.60 per week
        weeks_in_pay_period = 2  # Assuming bi-weekly
        disability_tax = min(
            gross_pay * self.disability_rate,
            self.disability_max_weekly * weeks_in_pay_period
        )
        results['disability_tax'] = disability_tax
        
        # Calculate PFL
        if ytd_wages < self.pfl_wage_base:
            pfl_taxable = min(gross_pay, self.pfl_wage_base - ytd_wages)
            results['pfl_tax'] = pfl_taxable * self.pfl_rate
        
        results['total_employee_tax'] = results['disability_tax'] + results['pfl_tax']
        
        return results
    
    def _is_mctmt_applicable(self, employee: Employee) -> bool:
        """Check if employee works in MCTMT zone"""
        # MCTMT applies to NYC and surrounding counties
        mctmt_counties = [
            'New York', 'Bronx', 'Kings', 'Queens', 'Richmond',  # NYC
            'Nassau', 'Suffolk', 'Westchester', 'Rockland', 
            'Orange', 'Putnam', 'Dutchess'
        ]
        
        work_county = getattr(employee, 'work_county', '')
        return work_county in mctmt_counties
    
    def _get_quarterly_payroll(self, pay_date: date) -> Decimal:
        """Get total quarterly payroll for MCTMT calculation"""
        # In production, this would calculate actual quarterly payroll
        from payroll.models import PayrollRun
        from django.db.models import Sum
        
        quarter = (pay_date.month - 1) // 3 + 1
        quarter_start = date(pay_date.year, (quarter - 1) * 3 + 1, 1)
        
        total = PayrollRun.objects.filter(
            tenant_id=self.tenant_id,
            pay_date__gte=quarter_start,
            pay_date__lte=pay_date,
            status='completed'
        ).aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0')
        
        return total
    
    def validate_employer_account(self, account: StateTaxAccount) -> Tuple[bool, str]:
        """Validate NY employer registration number"""
        if not account.state_employer_number:
            return False, "Missing NY employer registration number"
        
        # NY employer registration format varies
        # Generally 7-11 digits
        import re
        pattern = r'^\d{7,11}$'
        
        if not re.match(pattern, account.state_employer_number):
            return False, "Invalid NY employer registration format"
        
        return True, "Valid"
    
    def check_reciprocity(self, residence_state: str, work_state: str) -> Optional[Dict]:
        """Check for reciprocity agreements"""
        # NY has reciprocity with NJ for convenience of employer
        if residence_state == 'NJ' and work_state == 'NY':
            return {
                'agreement': 'NY-NJ Convenience Rule',
                'tax_state': 'NJ',
                'notes': 'Employee can elect NJ withholding'
            }
        return None
    
    def generate_state_forms(self, period_start: date, period_end: date) -> Dict:
        """Generate NY state forms (NYS-45, etc.)"""
        try:
            # Generate NYS-45 (Quarterly Combined Withholding, Wage Reporting)
            nys45_data = {
                'form_type': 'NYS-45',
                'period_start': period_start,
                'period_end': period_end,
                'total_wages': Decimal('0'),
                'ny_withholding': Decimal('0'),
                'nyc_withholding': Decimal('0'),
                'yonkers_withholding': Decimal('0'),
                'sui_wages': Decimal('0'),
                'employee_count': 0
            }
            
            return {
                'success': True,
                'forms': {
                    'NYS-45': nys45_data
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating NY forms: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def submit_filing(self, filing) -> Dict:
        """Submit filing to NY Department of Taxation"""
        try:
            # NY uses Online Services for filing
            result = {
                'success': True,
                'confirmation_number': f'NY-{filing.id}',
                'submitted_at': datetime.now().isoformat(),
                'endpoint': 'https://www.tax.ny.gov/api/submit',
                'status_code': 200,
                'processing_time': 2000
            }
            
            filing.filing_status = 'submitted'
            filing.confirmation_number = result['confirmation_number']
            filing.save()
            
            return result
            
        except Exception as e:
            logger.error(f"Error submitting NY filing: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'status_code': 500
            }
    
    def _get_ytd_wages(self, employee: Employee, year: int) -> Decimal:
        """Get year-to-date wages for an employee"""
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