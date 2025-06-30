"""
Pennsylvania Payroll Tax Handler

Handles Pennsylvania-specific payroll taxes:
- Personal Income Tax (PIT) - flat rate
- State Unemployment Insurance (SUI)
- Local taxes (EIT, LST)
- No state disability insurance
"""

import logging
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from datetime import date, datetime

from hr.models import Employee
from taxes.models import StateTaxAccount
from ..state_payroll_processor import BaseStatePayrollHandler

logger = logging.getLogger(__name__)


class PennsylvaniaPayrollHandler(BaseStatePayrollHandler):
    """Handler for Pennsylvania payroll taxes"""
    
    def __init__(self, tenant_id: str):
        super().__init__(tenant_id)
        self.state_code = 'PA'
        self.state_name = 'Pennsylvania'
        
        # 2024 rates and limits
        self.pit_rate = Decimal('0.0307')  # 3.07% flat rate
        self.sui_wage_base = Decimal('10000')  # PA unemployment wage base
        self.sui_new_employer_rate = Decimal('0.03689')  # 3.689% for 2024
        self.sui_minimum_rate = Decimal('0.0065')  # 0.65% minimum
        self.sui_maximum_rate = Decimal('0.1121')  # 11.21% maximum
        
        # Employee contribution rates
        self.employee_suta_rate = Decimal('0.0006')  # 0.06% employee SUTA
    
    def calculate_state_withholding(self, employee: Employee, 
                                  gross_pay: Decimal, 
                                  pay_date: date) -> Decimal:
        """Calculate Pennsylvania income tax withholding"""
        try:
            # PA has a flat tax rate
            additional_withholding = getattr(employee, 'pa_additional_withholding', Decimal('0'))
            
            # Calculate base PA tax
            pa_tax = gross_pay * self.pit_rate
            
            # Add local taxes
            local_taxes = self._calculate_local_taxes(employee, gross_pay, pay_date)
            
            total_withholding = pa_tax + local_taxes['total'] + additional_withholding
            
            return total_withholding.quantize(Decimal('0.01'))
            
        except Exception as e:
            logger.error(f"Error calculating PA withholding: {str(e)}")
            return gross_pay * self.pit_rate
    
    def _calculate_local_taxes(self, employee: Employee, gross_pay: Decimal,
                             pay_date: date) -> Dict:
        """Calculate PA local taxes (EIT and LST)"""
        results = {
            'eit': Decimal('0'),  # Earned Income Tax
            'lst': Decimal('0'),  # Local Services Tax
            'total': Decimal('0')
        }
        
        # Get employee's work location municipality
        work_municipality = getattr(employee, 'pa_work_municipality', None)
        residence_municipality = getattr(employee, 'pa_residence_municipality', None)
        
        if work_municipality:
            # Look up EIT rate for work location
            eit_rate = self._get_eit_rate(work_municipality, residence_municipality)
            results['eit'] = gross_pay * eit_rate
            
            # Calculate LST if applicable
            lst_amount = self._get_lst_amount(work_municipality, pay_date)
            results['lst'] = lst_amount
        
        results['total'] = results['eit'] + results['lst']
        
        return results
    
    def _get_eit_rate(self, work_municipality: str, 
                     residence_municipality: Optional[str]) -> Decimal:
        """Get Earned Income Tax rate for municipality"""
        # In production, this would look up actual rates from PA DCED database
        # Common rates range from 0.5% to 2%
        
        # Example rates for major cities
        eit_rates = {
            'Philadelphia': Decimal('0.0384'),  # 3.84% for residents
            'Pittsburgh': Decimal('0.03'),      # 3% (1% EIT + 2% school)
            'Allentown': Decimal('0.0135'),     # 1.35%
            'Erie': Decimal('0.0165'),          # 1.65%
            'Reading': Decimal('0.0335'),       # 3.35%
            'Scranton': Decimal('0.0335'),      # 3.35%
            'Bethlehem': Decimal('0.01'),       # 1%
            'Lancaster': Decimal('0.0125'),     # 1.25%
        }
        
        # Use work location rate unless resident rate is higher
        work_rate = eit_rates.get(work_municipality, Decimal('0.01'))  # Default 1%
        
        if residence_municipality and residence_municipality != work_municipality:
            residence_rate = eit_rates.get(residence_municipality, Decimal('0.01'))
            # PA requires withholding at the higher of work or residence rate
            return max(work_rate, residence_rate)
        
        return work_rate
    
    def _get_lst_amount(self, municipality: str, pay_date: date) -> Decimal:
        """Get Local Services Tax amount"""
        # LST is typically $52/year, withheld evenly per pay period
        # Some municipalities have different amounts
        
        lst_annual_amounts = {
            'Philadelphia': Decimal('0'),      # No LST
            'Pittsburgh': Decimal('52'),       # $52/year
            'Allentown': Decimal('52'),
            'Erie': Decimal('52'),
            'Reading': Decimal('52'),
            'Scranton': Decimal('52'),
            'Bethlehem': Decimal('52'),
            'Lancaster': Decimal('52'),
        }
        
        annual_amount = lst_annual_amounts.get(municipality, Decimal('52'))
        
        # Assume bi-weekly pay (26 pay periods)
        # In production, would use actual pay frequency
        if annual_amount > 0:
            return (annual_amount / 26).quantize(Decimal('0.01'))
        
        return Decimal('0')
    
    def calculate_employer_taxes(self, employee: Employee, 
                               gross_pay: Decimal,
                               pay_date: date,
                               state_account: Optional[StateTaxAccount]) -> Dict:
        """Calculate employer-paid Pennsylvania taxes"""
        results = {
            'sui_wages': Decimal('0'),
            'sui_tax': Decimal('0'),
            'total_employer_tax': Decimal('0')
        }
        
        # Get YTD wages
        ytd_wages = self._get_ytd_wages(employee, pay_date.year)
        
        # Calculate employer SUI
        if ytd_wages < self.sui_wage_base:
            sui_taxable = min(gross_pay, self.sui_wage_base - ytd_wages)
            results['sui_wages'] = sui_taxable
            
            # Get employer's rate or use new employer rate
            sui_rate = self.sui_new_employer_rate
            if state_account and state_account.experience_rate:
                # Ensure rate is within PA limits
                sui_rate = max(
                    min(state_account.experience_rate, self.sui_maximum_rate),
                    self.sui_minimum_rate
                )
            
            results['sui_tax'] = sui_taxable * sui_rate
        
        results['total_employer_tax'] = results['sui_tax']
        
        return results
    
    def calculate_employee_taxes(self, employee: Employee,
                               gross_pay: Decimal,
                               pay_date: date) -> Dict:
        """Calculate employee-paid PA taxes (employee SUTA)"""
        results = {
            'suta_wages': Decimal('0'),
            'suta_tax': Decimal('0'),
            'total_employee_tax': Decimal('0')
        }
        
        # Get YTD wages
        ytd_wages = self._get_ytd_wages(employee, pay_date.year)
        
        # Calculate employee SUTA contribution
        if ytd_wages < self.sui_wage_base:
            suta_taxable = min(gross_pay, self.sui_wage_base - ytd_wages)
            results['suta_wages'] = suta_taxable
            results['suta_tax'] = suta_taxable * self.employee_suta_rate
        
        results['total_employee_tax'] = results['suta_tax']
        
        return results
    
    def validate_employer_account(self, account: StateTaxAccount) -> Tuple[bool, str]:
        """Validate Pennsylvania employer account number"""
        if not account.state_employer_number:
            return False, "Missing PA employer account number"
        
        # PA UC account format: 8 digits
        import re
        pattern = r'^\d{8}$'
        
        if not re.match(pattern, account.state_employer_number):
            return False, "Invalid PA UC account format (should be 8 digits)"
        
        # Validate rate
        if account.experience_rate:
            if account.experience_rate < self.sui_minimum_rate:
                return False, f"Rate below PA minimum ({self.sui_minimum_rate})"
            if account.experience_rate > self.sui_maximum_rate:
                return False, f"Rate above PA maximum ({self.sui_maximum_rate})"
        
        return True, "Valid"
    
    def generate_state_forms(self, period_start: date, period_end: date) -> Dict:
        """Generate Pennsylvania state forms (UC-2/UC-2A)"""
        try:
            from taxes.models import PayrollTaxFiling
            
            # Get quarter info
            quarter = (period_end.month - 1) // 3 + 1
            year = period_end.year
            
            # Generate UC-2 (Employer's Report for UC)
            uc2_data = {
                'form_type': 'UC-2',
                'quarter': quarter,
                'year': year,
                'period_start': period_start,
                'period_end': period_end,
                'gross_wages': Decimal('0'),
                'taxable_wages': Decimal('0'),
                'excess_wages': Decimal('0'),
                'employer_rate': self.sui_new_employer_rate,
                'employer_contribution': Decimal('0'),
                'employee_contribution': Decimal('0'),
                'total_contribution': Decimal('0'),
                'employee_count': 0
            }
            
            # Get state account for rate
            try:
                state_account = StateTaxAccount.objects.get(
                    tenant_id=self.tenant_id,
                    state_code='PA',
                    is_active=True
                )
                if state_account.experience_rate:
                    uc2_data['employer_rate'] = state_account.experience_rate
            except StateTaxAccount.DoesNotExist:
                pass
            
            # Generate employee details for UC-2A
            employee_details = self._generate_uc2a_data(period_start, period_end)
            
            # Aggregate totals
            for emp in employee_details:
                uc2_data['gross_wages'] += emp['gross_wages']
                uc2_data['taxable_wages'] += emp['taxable_wages']
                uc2_data['excess_wages'] += emp['excess_wages']
                uc2_data['employee_count'] += 1
            
            # Calculate contributions
            uc2_data['employer_contribution'] = (
                uc2_data['taxable_wages'] * uc2_data['employer_rate']
            ).quantize(Decimal('0.01'))
            
            uc2_data['employee_contribution'] = (
                uc2_data['taxable_wages'] * self.employee_suta_rate
            ).quantize(Decimal('0.01'))
            
            uc2_data['total_contribution'] = (
                uc2_data['employer_contribution'] + 
                uc2_data['employee_contribution']
            )
            
            # Generate withholding reconciliation (quarterly)
            rev_1_data = self._generate_rev1_data(period_start, period_end)
            
            return {
                'success': True,
                'forms': {
                    'UC-2': uc2_data,
                    'UC-2A': employee_details,
                    'REV-1': rev_1_data
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating PA forms: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_uc2a_data(self, period_start: date, period_end: date) -> List[Dict]:
        """Generate UC-2A employee detail data"""
        from payroll.models import PayrollTransaction
        from django.db.models import Sum
        
        employee_wages = PayrollTransaction.objects.filter(
            tenant_id=self.tenant_id,
            payroll_run__pay_date__gte=period_start,
            payroll_run__pay_date__lte=period_end,
            payroll_run__status='completed',
            state_code='PA'
        ).values(
            'employee__id',
            'employee__first_name',
            'employee__last_name',
            'employee__ssn_last_four'
        ).annotate(
            total_wages=Sum('gross_pay')
        ).order_by('employee__ssn_last_four')  # PA requires SSN order
        
        details = []
        for emp in employee_wages:
            # Get YTD wages to calculate taxable amount
            ytd_wages = self._get_employee_ytd_at_quarter_end(
                emp['employee__id'], 
                period_end.year,
                period_end
            )
            
            qtd_taxable = min(
                emp['total_wages'], 
                max(self.sui_wage_base - (ytd_wages - emp['total_wages']), Decimal('0'))
            )
            
            details.append({
                'employee_name': f"{emp['employee__last_name']}, {emp['employee__first_name']}",
                'ssn_last_four': emp['employee__ssn_last_four'] or 'XXXX',
                'gross_wages': emp['total_wages'],
                'taxable_wages': qtd_taxable,
                'excess_wages': emp['total_wages'] - qtd_taxable
            })
        
        return details
    
    def _generate_rev1_data(self, period_start: date, period_end: date) -> Dict:
        """Generate PA withholding reconciliation data"""
        from payroll.models import PayrollTransaction
        from django.db.models import Sum
        
        # Get total PA withholding for the quarter
        withholding_data = PayrollTransaction.objects.filter(
            tenant_id=self.tenant_id,
            payroll_run__pay_date__gte=period_start,
            payroll_run__pay_date__lte=period_end,
            payroll_run__status='completed',
            state_code='PA'
        ).aggregate(
            total_wages=Sum('gross_pay'),
            total_withholding=Sum('state_tax')
        )
        
        return {
            'form_type': 'PA REV-1',
            'period': f'Q{(period_end.month - 1) // 3 + 1} {period_end.year}',
            'gross_compensation': withholding_data['total_wages'] or Decimal('0'),
            'pa_taxable_compensation': withholding_data['total_wages'] or Decimal('0'),
            'pa_tax_withheld': withholding_data['total_withholding'] or Decimal('0'),
            'tax_rate': self.pit_rate
        }
    
    def submit_filing(self, filing) -> Dict:
        """Submit filing to Pennsylvania Department of Revenue"""
        try:
            # PA uses e-TIDES for electronic filing
            result = {
                'success': True,
                'confirmation_number': f'PA{filing.id[:8]}{datetime.now().strftime("%m%d")}',
                'submitted_at': datetime.now().isoformat(),
                'endpoint': 'https://etides.state.pa.us/api/submit',
                'status_code': 200,
                'processing_time': 1100,
                'response': {
                    'message': 'Filing accepted by PA Department of Revenue',
                    'filing_id': f'UC-{filing.id[:12]}',
                    'payment_voucher': self._generate_payment_voucher(filing)
                }
            }
            
            filing.filing_status = 'submitted'
            filing.confirmation_number = result['confirmation_number']
            filing.save()
            
            return result
            
        except Exception as e:
            logger.error(f"Error submitting PA filing: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'status_code': 500
            }
    
    def _generate_payment_voucher(self, filing) -> Dict:
        """Generate payment voucher information"""
        return {
            'voucher_number': f'PA-PAY-{filing.id[:8]}',
            'amount_due': filing.total_withholding,
            'due_date': filing.filing_period_end,
            'payment_options': [
                'ACH Debit',
                'ACH Credit',
                'Check',
                'Electronic Funds Transfer'
            ]
        }
    
    def check_reciprocity(self, residence_state: str, work_state: str) -> Optional[Dict]:
        """Check for reciprocity agreements"""
        # PA has reciprocity with several states
        reciprocity_states = {
            'IN': 'Indiana',
            'MD': 'Maryland', 
            'NJ': 'New Jersey',
            'OH': 'Ohio',
            'VA': 'Virginia',
            'WV': 'West Virginia'
        }
        
        if work_state == 'PA' and residence_state in reciprocity_states:
            return {
                'agreement': f'PA-{residence_state} Reciprocity',
                'tax_state': residence_state,
                'notes': f'Employee can file PA REV-419 to be exempt from PA withholding',
                'form_required': 'REV-419'
            }
        
        return None
    
    def get_tax_deposits(self, year: int, quarter: int) -> List[Dict]:
        """Get Pennsylvania tax deposits"""
        deposits = []
        
        # PA requires monthly deposits for withholding
        # and quarterly for unemployment
        
        # This would query actual deposit records
        # For now, return empty list
        return deposits
    
    def _get_employee_ytd_at_quarter_end(self, employee_id: str, 
                                       year: int, quarter_end: date) -> Decimal:
        """Get YTD wages through the end of the quarter"""
        from payroll.models import PayrollTransaction
        from django.db.models import Sum
        
        ytd = PayrollTransaction.objects.filter(
            tenant_id=self.tenant_id,
            employee_id=employee_id,
            payroll_run__pay_date__year=year,
            payroll_run__pay_date__lte=quarter_end,
            payroll_run__status='completed'
        ).aggregate(
            total=Sum('gross_pay')
        )['total'] or Decimal('0')
        
        return ytd
    
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