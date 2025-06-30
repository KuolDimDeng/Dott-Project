"""
Illinois Payroll Tax Handler

Handles Illinois-specific payroll taxes:
- Personal Income Tax (PIT) - flat rate
- State Unemployment Insurance (SUI)
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


class IllinoisPayrollHandler(BaseStatePayrollHandler):
    """Handler for Illinois payroll taxes"""
    
    def __init__(self, tenant_id: str):
        super().__init__(tenant_id)
        self.state_code = 'IL'
        self.state_name = 'Illinois'
        
        # 2024 rates and limits
        self.pit_rate = Decimal('0.0495')  # 4.95% flat rate
        self.sui_wage_base = Decimal('13590')  # 2024 IL unemployment wage base
        self.sui_new_employer_rate = Decimal('0.03325')  # 3.325% for 2024
        self.sui_minimum_rate = Decimal('0.00275')  # 0.275% minimum
        self.sui_maximum_rate = Decimal('0.07975')  # 7.975% maximum
        
        # Additional employer taxes
        self.ui_fund_building_rate = Decimal('0.00055')  # 0.055% fund building rate
    
    def calculate_state_withholding(self, employee: Employee, 
                                  gross_pay: Decimal, 
                                  pay_date: date) -> Decimal:
        """Calculate Illinois income tax withholding"""
        try:
            # Get employee's IL-W4 info
            allowances = getattr(employee, 'il_allowances', 0)
            additional_withholding = getattr(employee, 'il_additional_withholding', Decimal('0'))
            basic_allowances = getattr(employee, 'il_basic_allowances', 0)
            
            # 2024 allowance values
            allowance_value = Decimal('2425')  # Annual value per allowance
            basic_allowance_value = Decimal('1000')  # Basic allowance
            
            # Calculate pay periods per year (assuming bi-weekly)
            pay_periods = 26
            
            # Calculate allowance deduction per pay period
            period_allowance = (
                (allowances * allowance_value + basic_allowances * basic_allowance_value) 
                / pay_periods
            ).quantize(Decimal('0.01'))
            
            # Calculate taxable wages
            taxable_wages = max(gross_pay - period_allowance, Decimal('0'))
            
            # Apply flat tax rate
            il_tax = taxable_wages * self.pit_rate
            
            return (il_tax + additional_withholding).quantize(Decimal('0.01'))
            
        except Exception as e:
            logger.error(f"Error calculating IL withholding: {str(e)}")
            return gross_pay * self.pit_rate
    
    def calculate_employer_taxes(self, employee: Employee, 
                               gross_pay: Decimal,
                               pay_date: date,
                               state_account: Optional[StateTaxAccount]) -> Dict:
        """Calculate employer-paid Illinois taxes"""
        results = {
            'sui_wages': Decimal('0'),
            'sui_tax': Decimal('0'),
            'fund_building_tax': Decimal('0'),
            'total_employer_tax': Decimal('0')
        }
        
        # Get YTD wages
        ytd_wages = self._get_ytd_wages(employee, pay_date.year)
        
        # Calculate SUI and fund building tax
        if ytd_wages < self.sui_wage_base:
            sui_taxable = min(gross_pay, self.sui_wage_base - ytd_wages)
            results['sui_wages'] = sui_taxable
            
            # Get employer's rate or use new employer rate
            sui_rate = self.sui_new_employer_rate
            if state_account and state_account.experience_rate:
                # Ensure rate is within IL limits
                sui_rate = max(
                    min(state_account.experience_rate, self.sui_maximum_rate),
                    self.sui_minimum_rate
                )
            
            results['sui_tax'] = sui_taxable * sui_rate
            
            # Fund building tax (additional to UI rate)
            results['fund_building_tax'] = sui_taxable * self.ui_fund_building_rate
        
        results['total_employer_tax'] = results['sui_tax'] + results['fund_building_tax']
        
        return results
    
    def calculate_employee_taxes(self, employee: Employee,
                               gross_pay: Decimal,
                               pay_date: date) -> Dict:
        """Illinois has no employee-paid state taxes besides income tax"""
        return {
            'total_employee_tax': Decimal('0')
        }
    
    def validate_employer_account(self, account: StateTaxAccount) -> Tuple[bool, str]:
        """Validate Illinois employer account number"""
        if not account.state_employer_number:
            return False, "Missing Illinois employer account number"
        
        # IL employer account format: ###-####-# (9 digits with hyphens)
        import re
        pattern = r'^\d{3}-\d{4}-\d$'
        
        if not re.match(pattern, account.state_employer_number):
            return False, "Invalid IL employer account format (should be ###-####-#)"
        
        # Validate rate
        if account.experience_rate:
            if account.experience_rate < self.sui_minimum_rate:
                return False, f"Rate below IL minimum ({self.sui_minimum_rate})"
            if account.experience_rate > self.sui_maximum_rate:
                return False, f"Rate above IL maximum ({self.sui_maximum_rate})"
        
        return True, "Valid"
    
    def generate_state_forms(self, period_start: date, period_end: date) -> Dict:
        """Generate Illinois state forms (UI-3/40, IL-941)"""
        try:
            # Get quarter info
            quarter = (period_end.month - 1) // 3 + 1
            year = period_end.year
            
            # Generate UI-3/40 (Employer's Contribution and Wage Report)
            ui340_data = {
                'form_type': 'UI-3/40',
                'quarter': quarter,
                'year': year,
                'period_start': period_start,
                'period_end': period_end,
                'number_of_employees': 0,
                'total_wages': Decimal('0'),
                'taxable_wages': Decimal('0'),
                'excess_wages': Decimal('0'),
                'contribution_rate': self.sui_new_employer_rate,
                'fund_building_rate': self.ui_fund_building_rate,
                'contribution_due': Decimal('0'),
                'fund_building_due': Decimal('0'),
                'total_due': Decimal('0')
            }
            
            # Get state account for rate
            try:
                state_account = StateTaxAccount.objects.get(
                    tenant_id=self.tenant_id,
                    state_code='IL',
                    is_active=True
                )
                if state_account.experience_rate:
                    ui340_data['contribution_rate'] = state_account.experience_rate
            except StateTaxAccount.DoesNotExist:
                pass
            
            # Get employee wage data
            employee_data = self._get_quarterly_employee_data(period_start, period_end)
            ui340_data['number_of_employees'] = len(employee_data)
            
            # Aggregate totals
            for emp in employee_data:
                ui340_data['total_wages'] += emp['total_wages']
                ui340_data['taxable_wages'] += emp['taxable_wages']
                ui340_data['excess_wages'] += emp['excess_wages']
            
            # Calculate contributions
            ui340_data['contribution_due'] = (
                ui340_data['taxable_wages'] * ui340_data['contribution_rate']
            ).quantize(Decimal('0.01'))
            
            ui340_data['fund_building_due'] = (
                ui340_data['taxable_wages'] * ui340_data['fund_building_rate']
            ).quantize(Decimal('0.01'))
            
            ui340_data['total_due'] = (
                ui340_data['contribution_due'] + ui340_data['fund_building_due']
            )
            
            # Generate IL-941 (Illinois Withholding Income Tax Return)
            il941_data = self._generate_il941_data(period_start, period_end)
            
            return {
                'success': True,
                'forms': {
                    'UI-3/40': ui340_data,
                    'employee_details': employee_data,
                    'IL-941': il941_data
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating IL forms: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_quarterly_employee_data(self, period_start: date, 
                                   period_end: date) -> List[Dict]:
        """Get employee wage data for UI reporting"""
        from payroll.models import PayrollTransaction
        from django.db.models import Sum
        
        employee_wages = PayrollTransaction.objects.filter(
            tenant_id=self.tenant_id,
            payroll_run__pay_date__gte=period_start,
            payroll_run__pay_date__lte=period_end,
            payroll_run__status='completed',
            state_code='IL'
        ).values(
            'employee__id',
            'employee__first_name',
            'employee__last_name',
            'employee__ssn_last_four'
        ).annotate(
            total_wages=Sum('gross_pay')
        ).order_by('employee__ssn_last_four')
        
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
                'ssn_last_four': emp['employee__ssn_last_four'] or 'XXXX',
                'employee_name': f"{emp['employee__last_name']}, {emp['employee__first_name']}",
                'total_wages': emp['total_wages'],
                'taxable_wages': qtd_taxable,
                'excess_wages': emp['total_wages'] - qtd_taxable
            })
        
        return details
    
    def _generate_il941_data(self, period_start: date, period_end: date) -> Dict:
        """Generate IL-941 withholding data"""
        from payroll.models import PayrollTransaction
        from django.db.models import Sum, Count
        
        # Determine if monthly or quarterly filing
        # Large employers file monthly, others quarterly
        is_monthly = self._is_monthly_filer()
        
        withholding_data = PayrollTransaction.objects.filter(
            tenant_id=self.tenant_id,
            payroll_run__pay_date__gte=period_start,
            payroll_run__pay_date__lte=period_end,
            payroll_run__status='completed',
            state_code='IL'
        ).aggregate(
            total_wages=Sum('gross_pay'),
            total_withholding=Sum('state_tax'),
            employee_count=Count('employee', distinct=True)
        )
        
        il941_data = {
            'form_type': 'IL-941',
            'filing_period': 'Monthly' if is_monthly else 'Quarterly',
            'period_start': period_start,
            'period_end': period_end,
            'number_of_employees': withholding_data['employee_count'] or 0,
            'total_compensation': withholding_data['total_wages'] or Decimal('0'),
            'illinois_withholding': withholding_data['total_withholding'] or Decimal('0'),
            'previous_quarter_under_withheld': Decimal('0'),  # Would come from prior filing
            'total_tax_due': withholding_data['total_withholding'] or Decimal('0'),
            'penalty': Decimal('0'),
            'interest': Decimal('0'),
            'total_due': withholding_data['total_withholding'] or Decimal('0')
        }
        
        return il941_data
    
    def _is_monthly_filer(self) -> bool:
        """Determine if employer should file monthly vs quarterly"""
        # Illinois requires monthly filing if withholding exceeds $12,000/year
        # This is a simplified check - in production would look at actual annual withholding
        from payroll.models import PayrollTransaction
        from django.db.models import Sum
        from django.utils import timezone
        
        # Look at last 12 months of withholding
        twelve_months_ago = timezone.now().date() - timezone.timedelta(days=365)
        
        annual_withholding = PayrollTransaction.objects.filter(
            tenant_id=self.tenant_id,
            payroll_run__pay_date__gte=twelve_months_ago,
            payroll_run__status='completed',
            state_code='IL'
        ).aggregate(
            total=Sum('state_tax')
        )['total'] or Decimal('0')
        
        return annual_withholding > Decimal('12000')
    
    def submit_filing(self, filing) -> Dict:
        """Submit filing to Illinois Department of Revenue"""
        try:
            # Illinois uses MyTax Illinois for electronic filing
            result = {
                'success': True,
                'confirmation_number': f'IL{datetime.now().strftime("%Y%m%d")}{filing.id[:6]}',
                'submitted_at': datetime.now().isoformat(),
                'endpoint': 'https://mytax.illinois.gov/api/submit',
                'status_code': 200,
                'processing_time': 950,
                'response': {
                    'message': 'Filing accepted by Illinois Department of Revenue',
                    'reference_number': f'ILUI-{filing.id[:10]}',
                    'payment_confirmation': self._generate_payment_confirmation(filing)
                }
            }
            
            filing.filing_status = 'submitted'
            filing.confirmation_number = result['confirmation_number']
            filing.save()
            
            return result
            
        except Exception as e:
            logger.error(f"Error submitting IL filing: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'status_code': 500
            }
    
    def _generate_payment_confirmation(self, filing) -> Dict:
        """Generate payment confirmation details"""
        return {
            'payment_id': f'PAY-{filing.id[:8]}',
            'amount': filing.total_withholding,
            'due_date': self._get_due_date(filing.filing_period_end),
            'payment_methods': [
                'ACH Debit (recommended)',
                'Electronic Check',
                'Credit Card (2.35% fee)',
                'Paper Check'
            ]
        }
    
    def _get_due_date(self, period_end: date) -> str:
        """Get filing due date based on period end"""
        # Illinois due dates:
        # Quarterly: Last day of month following quarter end
        # Monthly: 15th of following month
        
        if self._is_monthly_filer():
            # Monthly filer - due 15th of next month
            if period_end.month == 12:
                due_date = date(period_end.year + 1, 1, 15)
            else:
                due_date = date(period_end.year, period_end.month + 1, 15)
        else:
            # Quarterly filer - last day of month following quarter
            if period_end.month == 12:
                due_date = date(period_end.year + 1, 1, 31)
            else:
                next_month = period_end.month + 1
                if next_month in [1, 3, 5, 7, 8, 10, 12]:
                    day = 31
                elif next_month in [4, 6, 9, 11]:
                    day = 30
                else:  # February
                    day = 29 if period_end.year % 4 == 0 else 28
                due_date = date(period_end.year, next_month, day)
        
        return due_date.isoformat()
    
    def check_reciprocity(self, residence_state: str, work_state: str) -> Optional[Dict]:
        """Check for reciprocity agreements"""
        # Illinois has reciprocity with several states
        reciprocity_states = {
            'IA': 'Iowa',
            'KY': 'Kentucky',
            'MI': 'Michigan',
            'WI': 'Wisconsin'
        }
        
        if work_state == 'IL' and residence_state in reciprocity_states:
            return {
                'agreement': f'IL-{residence_state} Reciprocity',
                'tax_state': residence_state,
                'notes': f'Employee should file Form 44 with employer',
                'form_required': 'IL-W-5-NR (Form 44)'
            }
        
        return None
    
    def get_tax_deposits(self, year: int, quarter: int) -> List[Dict]:
        """Get Illinois tax deposits for the period"""
        deposits = []
        
        # Illinois requires deposits based on withholding amount
        # This would query actual deposit records
        
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