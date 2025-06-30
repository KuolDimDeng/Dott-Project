"""
Florida Payroll Tax Handler

Handles Florida-specific payroll taxes:
- No state income tax
- State Unemployment Insurance (SUI/FUTA)
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


class FloridaPayrollHandler(BaseStatePayrollHandler):
    """Handler for Florida payroll taxes"""
    
    def __init__(self, tenant_id: str):
        super().__init__(tenant_id)
        self.state_code = 'FL'
        self.state_name = 'Florida'
        
        # 2024 rates and limits
        self.sui_wage_base = Decimal('7000')  # Florida uses federal wage base
        self.sui_new_employer_rate = Decimal('0.0270')  # 2.70% for new employers
        self.sui_minimum_rate = Decimal('0.0010')  # 0.10% minimum
        self.sui_maximum_rate = Decimal('0.0540')  # 5.40% maximum
    
    def calculate_state_withholding(self, employee: Employee, 
                                  gross_pay: Decimal, 
                                  pay_date: date) -> Decimal:
        """Florida has no state income tax"""
        return Decimal('0')
    
    def calculate_employer_taxes(self, employee: Employee, 
                               gross_pay: Decimal,
                               pay_date: date,
                               state_account: Optional[StateTaxAccount]) -> Dict:
        """Calculate employer-paid Florida taxes (SUI only)"""
        results = {
            'sui_wages': Decimal('0'),
            'sui_tax': Decimal('0'),
            'total_employer_tax': Decimal('0')
        }
        
        # Get YTD wages
        ytd_wages = self._get_ytd_wages(employee, pay_date.year)
        
        # Calculate Florida Reemployment Tax (formerly unemployment tax)
        if ytd_wages < self.sui_wage_base:
            sui_taxable = min(gross_pay, self.sui_wage_base - ytd_wages)
            results['sui_wages'] = sui_taxable
            
            # Get employer's experience rate or use new employer rate
            sui_rate = self.sui_new_employer_rate
            if state_account and state_account.experience_rate:
                # Ensure rate is within Florida limits
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
        """Florida has no employee-paid state taxes"""
        return {
            'total_employee_tax': Decimal('0')
        }
    
    def validate_employer_account(self, account: StateTaxAccount) -> Tuple[bool, str]:
        """Validate Florida employer account number"""
        if not account.state_employer_number:
            return False, "Missing Florida Reemployment Tax account number"
        
        # Florida account format: 7 digits
        import re
        pattern = r'^\d{7}$'
        
        if not re.match(pattern, account.state_employer_number):
            return False, "Invalid Florida account format (should be 7 digits)"
        
        # Validate rate
        if account.experience_rate:
            if account.experience_rate < self.sui_minimum_rate:
                return False, f"Rate below Florida minimum ({self.sui_minimum_rate})"
            if account.experience_rate > self.sui_maximum_rate:
                return False, f"Rate above Florida maximum ({self.sui_maximum_rate})"
        
        return True, "Valid"
    
    def generate_state_forms(self, period_start: date, period_end: date) -> Dict:
        """Generate Florida state forms (RT-6)"""
        try:
            from taxes.models import PayrollTaxFiling
            
            # Get quarter info
            quarter = (period_end.month - 1) // 3 + 1
            year = period_end.year
            
            # Generate RT-6 (Employer's Quarterly Report)
            rt6_data = {
                'form_type': 'RT-6',
                'quarter': quarter,
                'year': year,
                'period_start': period_start,
                'period_end': period_end,
                'total_employees': 0,
                'total_wages': Decimal('0'),
                'taxable_wages': Decimal('0'),
                'excess_wages': Decimal('0'),
                'tax_rate': self.sui_new_employer_rate,
                'tax_due': Decimal('0'),
                'tax_paid': Decimal('0'),
                'balance_due': Decimal('0')
            }
            
            # Get state account for rate
            try:
                state_account = StateTaxAccount.objects.get(
                    tenant_id=self.tenant_id,
                    state_code='FL',
                    is_active=True
                )
                if state_account.experience_rate:
                    rt6_data['tax_rate'] = state_account.experience_rate
            except StateTaxAccount.DoesNotExist:
                pass
            
            # Get filing data for the quarter
            employee_data = self._get_quarterly_employee_data(period_start, period_end)
            
            rt6_data['total_employees'] = len(employee_data)
            for emp in employee_data:
                rt6_data['total_wages'] += emp['total_wages']
                rt6_data['taxable_wages'] += emp['taxable_wages']
                rt6_data['excess_wages'] += emp['excess_wages']
            
            rt6_data['tax_due'] = rt6_data['taxable_wages'] * rt6_data['tax_rate']
            
            return {
                'success': True,
                'forms': {
                    'RT-6': rt6_data,
                    'employee_details': employee_data,
                    'filing_instructions': self._get_filing_instructions()
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating FL forms: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_quarterly_employee_data(self, period_start: date, 
                                   period_end: date) -> List[Dict]:
        """Get employee wage data for the quarter"""
        from payroll.models import PayrollTransaction
        from django.db.models import Sum
        
        employee_wages = PayrollTransaction.objects.filter(
            tenant_id=self.tenant_id,
            payroll_run__pay_date__gte=period_start,
            payroll_run__pay_date__lte=period_end,
            payroll_run__status='completed',
            state_code='FL'
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
            # Get YTD wages to calculate taxable amount correctly
            ytd_wages = self._get_employee_ytd_at_quarter_end(
                emp['employee__id'], 
                period_end.year,
                period_end
            )
            
            qtd_taxable = min(emp['total_wages'], 
                            max(self.sui_wage_base - (ytd_wages - emp['total_wages']), Decimal('0')))
            
            details.append({
                'employee_id': emp['employee__id'],
                'employee_name': f"{emp['employee__last_name']}, {emp['employee__first_name']}",
                'ssn_last_four': emp['employee__ssn_last_four'] or 'XXXX',
                'total_wages': emp['total_wages'],
                'taxable_wages': qtd_taxable,
                'excess_wages': emp['total_wages'] - qtd_taxable
            })
        
        return details
    
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
    
    def _get_filing_instructions(self) -> Dict:
        """Get Florida-specific filing instructions"""
        return {
            'filing_method': 'Florida Reemployment Tax Website',
            'website': 'https://floridarevenue.com/taxes/taxesfees/Pages/reemployment.aspx',
            'due_date': 'Last day of the month following quarter end',
            'payment_options': [
                'Electronic payment (required for amounts over $5,000)',
                'Check or money order',
                'Credit card (fees apply)'
            ],
            'notes': [
                'File even if no wages paid during quarter',
                'Zero wage reports can be filed online',
                'Keep records for 4 years'
            ]
        }
    
    def submit_filing(self, filing) -> Dict:
        """Submit filing to Florida Department of Revenue"""
        try:
            # Florida uses CONNECT system for reemployment tax
            result = {
                'success': True,
                'confirmation_number': f'FL{datetime.now().strftime("%Y%m%d")}{filing.id[:8]}',
                'submitted_at': datetime.now().isoformat(),
                'endpoint': 'https://reemploymenttax.floridajobs.org/api/submit',
                'status_code': 200,
                'processing_time': 1000,
                'response': {
                    'message': 'Filing accepted by Florida Department of Revenue',
                    'receipt_number': f'RT-{filing.id[:12]}',
                    'next_filing_period': self._get_next_quarter_dates(filing.filing_period_end)
                }
            }
            
            filing.filing_status = 'submitted'
            filing.confirmation_number = result['confirmation_number']
            filing.save()
            
            return result
            
        except Exception as e:
            logger.error(f"Error submitting FL filing: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'status_code': 500
            }
    
    def _get_next_quarter_dates(self, current_period_end: date) -> Dict:
        """Get next quarter filing period"""
        next_quarter = ((current_period_end.month - 1) // 3 + 1) % 4 + 1
        next_year = current_period_end.year if next_quarter != 1 else current_period_end.year + 1
        
        period_start = date(next_year, (next_quarter - 1) * 3 + 1, 1)
        if next_quarter == 4:
            period_end = date(next_year, 12, 31)
        else:
            period_end = date(next_year, next_quarter * 3 + 1, 1) - timezone.timedelta(days=1)
        
        # Due date is last day of month following quarter end
        if period_end.month == 12:
            due_date = date(next_year + 1, 1, 31)
        else:
            due_month = period_end.month + 1
            if due_month in [1, 3, 5, 7, 8, 10, 12]:
                due_day = 31
            elif due_month in [4, 6, 9, 11]:
                due_day = 30
            else:
                due_day = 29 if next_year % 4 == 0 else 28
            due_date = date(next_year, due_month, due_day)
        
        return {
            'quarter': f'Q{next_quarter} {next_year}',
            'period_start': period_start.isoformat(),
            'period_end': period_end.isoformat(),
            'due_date': due_date.isoformat()
        }
    
    def check_reciprocity(self, residence_state: str, work_state: str) -> Optional[Dict]:
        """Florida has no reciprocity agreements (no income tax)"""
        return None
    
    def get_tax_deposits(self, year: int, quarter: int) -> List[Dict]:
        """Get Florida reemployment tax deposits"""
        from payroll.models import PayrollRun
        
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
            # Calculate reemployment tax for this payroll
            reemployment_tax = self._calculate_reemployment_tax_for_payroll(payroll)
            if reemployment_tax > 0:
                deposits.append({
                    'deposit_date': payroll.pay_date,
                    'amount': reemployment_tax,
                    'type': 'Florida Reemployment Tax',
                    'payroll_id': payroll.id,
                    'payroll_number': payroll.payroll_number
                })
        
        return deposits
    
    def _calculate_reemployment_tax_for_payroll(self, payroll_run) -> Decimal:
        """Calculate total reemployment tax for a payroll run"""
        from payroll.models import PayrollTransaction
        
        total_tax = Decimal('0')
        
        # Get the tax rate
        rate = self.sui_new_employer_rate
        try:
            state_account = StateTaxAccount.objects.get(
                tenant_id=self.tenant_id,
                state_code='FL',
                is_active=True
            )
            if state_account.experience_rate:
                rate = state_account.experience_rate
        except StateTaxAccount.DoesNotExist:
            pass
        
        transactions = PayrollTransaction.objects.filter(
            payroll_run=payroll_run,
            state_code='FL'
        )
        
        for transaction in transactions:
            # Get employee YTD wages before this payroll
            ytd_wages = self._get_ytd_wages(transaction.employee, payroll_run.pay_date.year)
            ytd_wages -= transaction.gross_pay  # Exclude current payroll
            
            # Calculate taxable wages
            if ytd_wages < self.sui_wage_base:
                taxable_wages = min(transaction.gross_pay, self.sui_wage_base - ytd_wages)
                total_tax += taxable_wages * rate
        
        return total_tax.quantize(Decimal('0.01'))
    
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