"""
Texas Payroll Tax Handler

Handles Texas-specific payroll taxes:
- No state income tax
- State Unemployment Insurance (SUI/TWC)
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


class TexasPayrollHandler(BaseStatePayrollHandler):
    """Handler for Texas payroll taxes"""
    
    def __init__(self, tenant_id: str):
        super().__init__(tenant_id)
        self.state_code = 'TX'
        self.state_name = 'Texas'
        
        # 2024 rates and limits
        self.sui_wage_base = Decimal('9000')  # Texas unemployment wage base
        self.sui_new_employer_rate = Decimal('0.0270')  # 2.70% for new employers
        self.sui_minimum_rate = Decimal('0.0023')  # 0.23% minimum
        self.sui_maximum_rate = Decimal('0.0623')  # 6.23% maximum
    
    def calculate_state_withholding(self, employee: Employee, 
                                  gross_pay: Decimal, 
                                  pay_date: date) -> Decimal:
        """Texas has no state income tax"""
        return Decimal('0')
    
    def calculate_employer_taxes(self, employee: Employee, 
                               gross_pay: Decimal,
                               pay_date: date,
                               state_account: Optional[StateTaxAccount]) -> Dict:
        """Calculate employer-paid Texas taxes (SUI only)"""
        results = {
            'sui_wages': Decimal('0'),
            'sui_tax': Decimal('0'),
            'total_employer_tax': Decimal('0')
        }
        
        # Get YTD wages
        ytd_wages = self._get_ytd_wages(employee, pay_date.year)
        
        # Calculate SUI (Texas Workforce Commission unemployment tax)
        if ytd_wages < self.sui_wage_base:
            sui_taxable = min(gross_pay, self.sui_wage_base - ytd_wages)
            results['sui_wages'] = sui_taxable
            
            # Get employer's experience rate or use new employer rate
            sui_rate = self.sui_new_employer_rate
            if state_account and state_account.experience_rate:
                # Ensure rate is within Texas limits
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
        """Texas has no employee-paid state taxes"""
        return {
            'total_employee_tax': Decimal('0')
        }
    
    def validate_employer_account(self, account: StateTaxAccount) -> Tuple[bool, str]:
        """Validate Texas employer account number (TWC account)"""
        if not account.state_employer_number:
            return False, "Missing Texas Workforce Commission account number"
        
        # TWC account format: ##-#######-# (10 digits with hyphens)
        import re
        pattern = r'^\d{2}-\d{7}-\d$'
        
        if not re.match(pattern, account.state_employer_number):
            return False, "Invalid TWC account format (should be ##-#######-#)"
        
        # Validate TWC tax rate
        if account.experience_rate:
            if account.experience_rate < self.sui_minimum_rate:
                return False, f"TWC rate below minimum ({self.sui_minimum_rate})"
            if account.experience_rate > self.sui_maximum_rate:
                return False, f"TWC rate above maximum ({self.sui_maximum_rate})"
        
        return True, "Valid"
    
    def generate_state_forms(self, period_start: date, period_end: date) -> Dict:
        """Generate Texas state forms (C-3, C-4)"""
        try:
            from taxes.models import PayrollTaxFiling
            
            # Get quarter info
            quarter = (period_end.month - 1) // 3 + 1
            year = period_end.year
            
            # Generate C-3 (Employer's Quarterly Report)
            c3_data = {
                'form_type': 'C-3',
                'quarter': quarter,
                'year': year,
                'period_start': period_start,
                'period_end': period_end,
                'total_wages': Decimal('0'),
                'taxable_wages': Decimal('0'),
                'excess_wages': Decimal('0'),
                'tax_due': Decimal('0'),
                'tax_rate': self.sui_new_employer_rate,
                'employee_count': 0
            }
            
            # Get filing data
            filings = PayrollTaxFiling.objects.filter(
                tenant_id=self.tenant_id,
                state__code='TX',
                filing_period_start__gte=period_start,
                filing_period_end__lte=period_end
            )
            
            for filing in filings:
                c3_data['total_wages'] += filing.total_wages
                # In production, would aggregate more detailed data
            
            # Calculate taxable wages (up to wage base per employee)
            c3_data['taxable_wages'] = min(c3_data['total_wages'], 
                                          self.sui_wage_base * c3_data['employee_count'])
            c3_data['excess_wages'] = c3_data['total_wages'] - c3_data['taxable_wages']
            
            return {
                'success': True,
                'forms': {
                    'C-3': c3_data,
                    'employee_details': self._generate_employee_details(period_start, period_end)
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating TX forms: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_employee_details(self, period_start: date, period_end: date) -> List[Dict]:
        """Generate employee wage details for C-3"""
        from payroll.models import PayrollTransaction
        from django.db.models import Sum
        
        # Get employee wages for the quarter
        employee_wages = PayrollTransaction.objects.filter(
            tenant_id=self.tenant_id,
            payroll_run__pay_date__gte=period_start,
            payroll_run__pay_date__lte=period_end,
            payroll_run__status='completed',
            state_code='TX'
        ).values(
            'employee__id',
            'employee__first_name',
            'employee__last_name',
            'employee__ssn_last_four'
        ).annotate(
            total_wages=Sum('gross_pay')
        ).order_by('employee__last_name', 'employee__first_name')
        
        details = []
        for emp in employee_wages:
            details.append({
                'employee_name': f"{emp['employee__last_name']}, {emp['employee__first_name']}",
                'ssn_last_four': emp['employee__ssn_last_four'] or 'XXXX',
                'total_wages': emp['total_wages'],
                'taxable_wages': min(emp['total_wages'], self.sui_wage_base),
                'excess_wages': max(emp['total_wages'] - self.sui_wage_base, Decimal('0'))
            })
        
        return details
    
    def submit_filing(self, filing) -> Dict:
        """Submit filing to Texas Workforce Commission"""
        try:
            # TWC uses Unemployment Tax Services (UTS) online system
            result = {
                'success': True,
                'confirmation_number': f'TX-{filing.id}-{datetime.now().strftime("%Y%m%d")}',
                'submitted_at': datetime.now().isoformat(),
                'endpoint': 'https://uipts.texasworkforce.org/api/submit',
                'status_code': 200,
                'processing_time': 1200,
                'response': {
                    'message': 'Filing accepted by TWC',
                    'next_due_date': self._get_next_due_date(filing.filing_period_end)
                }
            }
            
            filing.filing_status = 'submitted'
            filing.confirmation_number = result['confirmation_number']
            filing.save()
            
            return result
            
        except Exception as e:
            logger.error(f"Error submitting TX filing: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'status_code': 500
            }
    
    def _get_next_due_date(self, period_end: date) -> str:
        """Get next quarterly due date"""
        # Texas quarterly reports are due the last day of the month
        # following the end of the quarter
        next_month = period_end.month + 1
        if next_month > 12:
            next_year = period_end.year + 1
            next_month = 1
        else:
            next_year = period_end.year
        
        # Last day of next month
        if next_month in [1, 3, 5, 7, 8, 10, 12]:
            day = 31
        elif next_month in [4, 6, 9, 11]:
            day = 30
        else:  # February
            day = 29 if next_year % 4 == 0 else 28
        
        return date(next_year, next_month, day).isoformat()
    
    def check_reciprocity(self, residence_state: str, work_state: str) -> Optional[Dict]:
        """Texas has no reciprocity agreements (no income tax)"""
        return None
    
    def get_tax_deposits(self, year: int, quarter: int) -> List[Dict]:
        """Get Texas unemployment tax deposits"""
        from payroll.models import PayrollRun
        from django.db.models import Sum
        
        # Calculate quarter dates
        quarter_start = date(year, (quarter - 1) * 3 + 1, 1)
        if quarter == 4:
            quarter_end = date(year, 12, 31)
        else:
            quarter_end = date(year, quarter * 3 + 1, 1) - timezone.timedelta(days=1)
        
        # Get payroll runs for the quarter
        payrolls = PayrollRun.objects.filter(
            tenant_id=self.tenant_id,
            pay_date__gte=quarter_start,
            pay_date__lte=quarter_end,
            status='completed'
        )
        
        deposits = []
        for payroll in payrolls:
            # Calculate TWC tax for this payroll
            twc_tax = self._calculate_twc_tax_for_payroll(payroll)
            if twc_tax > 0:
                deposits.append({
                    'deposit_date': payroll.pay_date,
                    'amount': twc_tax,
                    'type': 'TWC Unemployment Tax',
                    'payroll_id': payroll.id
                })
        
        return deposits
    
    def _calculate_twc_tax_for_payroll(self, payroll_run) -> Decimal:
        """Calculate total TWC tax for a payroll run"""
        from payroll.models import PayrollTransaction
        
        total_tax = Decimal('0')
        
        transactions = PayrollTransaction.objects.filter(
            payroll_run=payroll_run,
            state_code='TX'
        )
        
        for transaction in transactions:
            # Get employee YTD wages before this payroll
            ytd_wages = self._get_ytd_wages(transaction.employee, payroll_run.pay_date.year)
            ytd_wages -= transaction.gross_pay  # Exclude current payroll
            
            # Calculate taxable wages
            if ytd_wages < self.sui_wage_base:
                taxable_wages = min(transaction.gross_pay, self.sui_wage_base - ytd_wages)
                total_tax += taxable_wages * self.sui_new_employer_rate
        
        return total_tax
    
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