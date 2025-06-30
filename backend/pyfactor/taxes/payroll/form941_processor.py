"""
Form 941 Processor for Quarterly Payroll Tax Returns
Handles calculation, validation, and generation of Form 941
"""

from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Tuple
import json
from django.db import models
from django.db.models import Sum, Q
from django.utils import timezone

class Form941Processor:
    """Processes Form 941 quarterly payroll tax returns"""
    
    # Tax rates for 2024
    SOCIAL_SECURITY_RATE = Decimal('0.062')  # 6.2%
    MEDICARE_RATE = Decimal('0.0145')  # 1.45%
    ADDITIONAL_MEDICARE_RATE = Decimal('0.009')  # 0.9% on wages over threshold
    ADDITIONAL_MEDICARE_THRESHOLD_SINGLE = Decimal('200000')
    ADDITIONAL_MEDICARE_THRESHOLD_MARRIED = Decimal('250000')
    ADDITIONAL_MEDICARE_THRESHOLD_SEPARATE = Decimal('125000')
    
    # Social Security wage base for 2024
    SOCIAL_SECURITY_WAGE_BASE = Decimal('168600')
    
    # Federal tax deposit schedules
    DEPOSIT_SCHEDULE_MONTHLY = 'monthly'
    DEPOSIT_SCHEDULE_SEMIWEEKLY = 'semiweekly'
    
    def __init__(self, tenant_id: str, quarter: int, year: int):
        self.tenant_id = tenant_id
        self.quarter = quarter
        self.year = year
        self.start_date, self.end_date = self._get_quarter_dates()
        
    def _get_quarter_dates(self) -> Tuple[date, date]:
        """Get start and end dates for the quarter"""
        quarter_months = {
            1: (1, 3),
            2: (4, 6), 
            3: (7, 9),
            4: (10, 12)
        }
        
        start_month, end_month = quarter_months[self.quarter]
        start_date = date(self.year, start_month, 1)
        
        # Get last day of end month
        if end_month == 12:
            end_date = date(self.year, 12, 31)
        else:
            end_date = date(self.year, end_month + 1, 1) - timedelta(days=1)
            
        return start_date, end_date
    
    def calculate_form_941_data(self) -> Dict:
        """Calculate all Form 941 data for the quarter"""
        from payroll.models import PayrollRun, PayrollTransaction
        
        # Get all payroll runs for the quarter
        payroll_runs = PayrollRun.objects.filter(
            tenant_id=self.tenant_id,
            pay_date__gte=self.start_date,
            pay_date__lte=self.end_date,
            status='completed'
        )
        
        # Initialize form data
        form_data = {
            'ein': '',  # To be populated from tenant data
            'name': '',  # To be populated from tenant data
            'trade_name': '',
            'address': {},
            'quarter': self.quarter,
            'year': self.year,
            'quarter_start_date': self.start_date.isoformat(),
            'quarter_end_date': self.end_date.isoformat(),
            
            # Line items
            'number_of_employees': 0,
            'wages_tips_compensation': Decimal('0'),
            'federal_income_tax_withheld': Decimal('0'),
            'social_security_wages': Decimal('0'),
            'social_security_tax': Decimal('0'),
            'social_security_tips': Decimal('0'),
            'medicare_wages_tips': Decimal('0'),
            'medicare_tax': Decimal('0'),
            'additional_medicare_tax': Decimal('0'),
            'total_tax_before_adjustments': Decimal('0'),
            
            # Adjustments
            'current_quarter_adjustments': Decimal('0'),
            'total_tax_after_adjustments': Decimal('0'),
            
            # Deposits and payments
            'total_deposits': Decimal('0'),
            'balance_due': Decimal('0'),
            'overpayment': Decimal('0'),
            
            # Schedule B data (for semiweekly depositors)
            'deposit_schedule': self.DEPOSIT_SCHEDULE_MONTHLY,
            'liability_by_month': {},
            'schedule_b_data': [],
            
            # Other
            'third_party_designee': False,
            'seasonal_employer': False,
            'business_closed': False,
            'filing_deadline': self._get_filing_deadline().isoformat()
        }
        
        # Calculate employee counts and wages
        employee_data = self._calculate_employee_data(payroll_runs)
        form_data.update(employee_data)
        
        # Calculate taxes
        tax_data = self._calculate_taxes(payroll_runs)
        form_data.update(tax_data)
        
        # Calculate deposit schedule
        deposit_data = self._calculate_deposit_schedule(payroll_runs)
        form_data.update(deposit_data)
        
        # Validate calculations
        validation_errors = self._validate_form_data(form_data)
        form_data['validation_errors'] = validation_errors
        form_data['is_valid'] = len(validation_errors) == 0
        
        return form_data
    
    def _calculate_employee_data(self, payroll_runs) -> Dict:
        """Calculate employee counts and wage data"""
        from payroll.models import PayrollTransaction
        
        # Get unique employees
        employee_ids = set()
        total_wages = Decimal('0')
        total_tips = Decimal('0')
        
        transactions = PayrollTransaction.objects.filter(
            payroll_run__in=payroll_runs
        ).select_related('employee')
        
        for transaction in transactions:
            employee_ids.add(transaction.employee_id)
            total_wages += transaction.gross_pay
            # Tips would be tracked separately in a real system
            
        return {
            'number_of_employees': len(employee_ids),
            'wages_tips_compensation': total_wages + total_tips,
            'employee_list': list(employee_ids)
        }
    
    def _calculate_taxes(self, payroll_runs) -> Dict:
        """Calculate all tax amounts"""
        from payroll.models import PayrollTransaction
        
        transactions = PayrollTransaction.objects.filter(
            payroll_run__in=payroll_runs
        )
        
        # Aggregate tax data
        tax_totals = transactions.aggregate(
            federal_tax=Sum('federal_tax'),
            social_security_tax=Sum('social_security_tax'),
            medicare_tax=Sum('medicare_tax'),
            gross_pay=Sum('gross_pay')
        )
        
        federal_income_tax = tax_totals['federal_tax'] or Decimal('0')
        social_security_tax = tax_totals['social_security_tax'] or Decimal('0')
        medicare_tax = tax_totals['medicare_tax'] or Decimal('0')
        total_wages = tax_totals['gross_pay'] or Decimal('0')
        
        # Calculate social security wages (capped at wage base)
        social_security_wages = min(total_wages, self.SOCIAL_SECURITY_WAGE_BASE)
        
        # Calculate employer portions (double the employee portions)
        total_social_security_tax = social_security_tax * 2
        total_medicare_tax = medicare_tax * 2
        
        # Calculate additional Medicare tax (employee only, no employer match)
        additional_medicare_tax = self._calculate_additional_medicare_tax(transactions)
        
        # Total tax before adjustments
        total_tax = (
            federal_income_tax +
            total_social_security_tax +
            total_medicare_tax +
            additional_medicare_tax
        )
        
        return {
            'federal_income_tax_withheld': federal_income_tax,
            'social_security_wages': social_security_wages,
            'social_security_tax': total_social_security_tax,
            'medicare_wages_tips': total_wages,
            'medicare_tax': total_medicare_tax,
            'additional_medicare_tax': additional_medicare_tax,
            'total_tax_before_adjustments': total_tax,
            'total_tax_after_adjustments': total_tax  # Adjustments would be added here
        }
    
    def _calculate_additional_medicare_tax(self, transactions) -> Decimal:
        """Calculate additional Medicare tax on high earners"""
        additional_tax = Decimal('0')
        
        # Group by employee to check annual wages
        employee_wages = {}
        for transaction in transactions:
            employee_id = transaction.employee_id
            if employee_id not in employee_wages:
                employee_wages[employee_id] = Decimal('0')
            employee_wages[employee_id] += transaction.gross_pay
        
        # Check each employee's YTD wages
        for employee_id, quarter_wages in employee_wages.items():
            # This would need to check YTD wages, not just quarter
            # For now, we'll use a simplified calculation
            if quarter_wages > self.ADDITIONAL_MEDICARE_THRESHOLD_SINGLE / 4:
                excess = quarter_wages - (self.ADDITIONAL_MEDICARE_THRESHOLD_SINGLE / 4)
                additional_tax += excess * self.ADDITIONAL_MEDICARE_RATE
                
        return additional_tax
    
    def _calculate_deposit_schedule(self, payroll_runs) -> Dict:
        """Determine deposit schedule and calculate liabilities"""
        # Check previous year's total tax liability to determine schedule
        # If > $50,000, use semiweekly; otherwise monthly
        previous_year_liability = self._get_previous_year_liability()
        
        if previous_year_liability > Decimal('50000'):
            schedule = self.DEPOSIT_SCHEDULE_SEMIWEEKLY
            schedule_data = self._calculate_semiweekly_deposits(payroll_runs)
        else:
            schedule = self.DEPOSIT_SCHEDULE_MONTHLY
            schedule_data = self._calculate_monthly_deposits(payroll_runs)
            
        return {
            'deposit_schedule': schedule,
            'liability_by_month': schedule_data['monthly_liabilities'],
            'schedule_b_data': schedule_data.get('daily_liabilities', []),
            'total_deposits': schedule_data['total_deposits']
        }
    
    def _calculate_monthly_deposits(self, payroll_runs) -> Dict:
        """Calculate monthly deposit liabilities"""
        monthly_liabilities = {}
        total_deposits = Decimal('0')
        
        for month in range(self.start_date.month, self.end_date.month + 1):
            month_start = date(self.year, month, 1)
            if month == 12:
                month_end = date(self.year, 12, 31)
            else:
                month_end = date(self.year, month + 1, 1) - timedelta(days=1)
                
            month_runs = payroll_runs.filter(
                pay_date__gte=month_start,
                pay_date__lte=month_end
            )
            
            month_liability = Decimal('0')
            for run in month_runs:
                run_liability = self._calculate_run_liability(run)
                month_liability += run_liability
                
            monthly_liabilities[month] = {
                'liability': month_liability,
                'deposit_due_date': self._get_monthly_deposit_due_date(month)
            }
            total_deposits += month_liability
            
        return {
            'monthly_liabilities': monthly_liabilities,
            'total_deposits': total_deposits
        }
    
    def _calculate_semiweekly_deposits(self, payroll_runs) -> Dict:
        """Calculate semiweekly deposit liabilities"""
        daily_liabilities = []
        monthly_liabilities = {}
        total_deposits = Decimal('0')
        
        # Track liabilities by day
        for run in payroll_runs:
            liability = self._calculate_run_liability(run)
            daily_liabilities.append({
                'date': run.pay_date,
                'liability': liability,
                'deposit_due_date': self._get_semiweekly_deposit_due_date(run.pay_date)
            })
            
            # Also track by month for summary
            month = run.pay_date.month
            if month not in monthly_liabilities:
                monthly_liabilities[month] = Decimal('0')
            monthly_liabilities[month] += liability
            total_deposits += liability
            
        return {
            'daily_liabilities': daily_liabilities,
            'monthly_liabilities': monthly_liabilities,
            'total_deposits': total_deposits
        }
    
    def _calculate_run_liability(self, payroll_run) -> Decimal:
        """Calculate tax liability for a single payroll run"""
        from payroll.models import PayrollTransaction
        
        transactions = PayrollTransaction.objects.filter(
            payroll_run=payroll_run
        )
        
        liability = transactions.aggregate(
            total=Sum('federal_tax') + 
                  Sum('social_security_tax') * 2 +  # Employee + employer
                  Sum('medicare_tax') * 2  # Employee + employer
        )['total'] or Decimal('0')
        
        return liability
    
    def _get_previous_year_liability(self) -> Decimal:
        """Get previous year's total tax liability"""
        # This would query historical Form 941 data
        # For now, return a placeholder
        return Decimal('40000')
    
    def _get_filing_deadline(self) -> date:
        """Get Form 941 filing deadline"""
        deadlines = {
            1: date(self.year, 4, 30),
            2: date(self.year, 7, 31),
            3: date(self.year, 10, 31),
            4: date(self.year + 1, 1, 31)
        }
        return deadlines[self.quarter]
    
    def _get_monthly_deposit_due_date(self, month: int) -> date:
        """Get deposit due date for monthly depositors"""
        # Due 15th of following month
        if month == 12:
            return date(self.year + 1, 1, 15)
        else:
            return date(self.year, month + 1, 15)
    
    def _get_semiweekly_deposit_due_date(self, pay_date: date) -> date:
        """Get deposit due date for semiweekly depositors"""
        # Wednesday, Thursday, Friday -> following Wednesday
        # Saturday, Sunday, Monday, Tuesday -> following Friday
        weekday = pay_date.weekday()
        
        if weekday in [2, 3, 4]:  # Wed, Thu, Fri
            # Next Wednesday
            days_ahead = 2 - weekday + 7  # Wednesday is 2
            if days_ahead <= 0:
                days_ahead += 7
        else:  # Sat, Sun, Mon, Tue
            # Next Friday
            days_ahead = 4 - weekday  # Friday is 4
            if days_ahead <= 0:
                days_ahead += 7
                
        return pay_date + timedelta(days=days_ahead)
    
    def _validate_form_data(self, form_data: Dict) -> List[str]:
        """Validate Form 941 data against IRS rules"""
        errors = []
        
        # Check required fields
        if not form_data.get('ein'):
            errors.append("EIN is required")
            
        if not form_data.get('name'):
            errors.append("Business name is required")
            
        # Validate calculations
        wages = form_data.get('wages_tips_compensation', Decimal('0'))
        ss_wages = form_data.get('social_security_wages', Decimal('0'))
        medicare_wages = form_data.get('medicare_wages_tips', Decimal('0'))
        
        if ss_wages > wages:
            errors.append("Social Security wages cannot exceed total wages")
            
        if medicare_wages != wages:
            errors.append("Medicare wages should equal total wages")
            
        # Validate tax calculations
        expected_ss_tax = ss_wages * self.SOCIAL_SECURITY_RATE * 2
        actual_ss_tax = form_data.get('social_security_tax', Decimal('0'))
        
        if abs(expected_ss_tax - actual_ss_tax) > Decimal('1'):
            errors.append(f"Social Security tax calculation error: expected {expected_ss_tax}, got {actual_ss_tax}")
            
        expected_medicare_tax = medicare_wages * self.MEDICARE_RATE * 2
        actual_medicare_tax = form_data.get('medicare_tax', Decimal('0'))
        
        if abs(expected_medicare_tax - actual_medicare_tax) > Decimal('1'):
            errors.append(f"Medicare tax calculation error: expected {expected_medicare_tax}, got {actual_medicare_tax}")
            
        # Check deposit schedule
        if form_data.get('deposit_schedule') == self.DEPOSIT_SCHEDULE_SEMIWEEKLY:
            if not form_data.get('schedule_b_data'):
                errors.append("Schedule B data required for semiweekly depositors")
                
        return errors
    
    def generate_form_941_json(self, form_data: Dict) -> str:
        """Generate Form 941 data in JSON format for e-filing"""
        # Round all decimal values to 2 places
        for key, value in form_data.items():
            if isinstance(value, Decimal):
                form_data[key] = str(value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
                
        return json.dumps(form_data, indent=2, default=str)
    
    def generate_schedule_b(self, form_data: Dict) -> Optional[Dict]:
        """Generate Schedule B for semiweekly depositors"""
        if form_data.get('deposit_schedule') != self.DEPOSIT_SCHEDULE_SEMIWEEKLY:
            return None
            
        schedule_b = {
            'employer_identification_number': form_data.get('ein'),
            'name': form_data.get('name'),
            'quarter': self.quarter,
            'year': self.year,
            'month_1_total': Decimal('0'),
            'month_2_total': Decimal('0'),
            'month_3_total': Decimal('0'),
            'daily_liabilities': []
        }
        
        # Organize daily liabilities by month
        for liability in form_data.get('schedule_b_data', []):
            date_obj = datetime.fromisoformat(liability['date']).date()
            month_num = date_obj.month - self.start_date.month + 1
            
            schedule_b['daily_liabilities'].append({
                'month': month_num,
                'day': date_obj.day,
                'liability': liability['liability']
            })
            
            # Add to monthly totals
            if month_num == 1:
                schedule_b['month_1_total'] += liability['liability']
            elif month_num == 2:
                schedule_b['month_2_total'] += liability['liability']
            elif month_num == 3:
                schedule_b['month_3_total'] += liability['liability']
                
        return schedule_b