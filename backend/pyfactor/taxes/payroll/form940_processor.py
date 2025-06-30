"""
Form 940 Processor for Annual Federal Unemployment Tax Returns (FUTA)
Handles calculation, validation, and generation of Form 940
"""

from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Tuple, Any
import json
import logging
from django.db import models, transaction
from django.db.models import Sum, Q, F
from django.utils import timezone
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


class Form940Processor:
    """Processes Form 940 annual federal unemployment tax returns"""
    
    # FUTA tax rates and limits for 2024
    FUTA_RATE = Decimal('0.006')  # 0.6% (after maximum credit)
    FUTA_RATE_BEFORE_CREDIT = Decimal('0.060')  # 6.0% before credit
    FUTA_WAGE_BASE = Decimal('7000')  # Per employee per year
    FUTA_CREDIT_REDUCTION_STATES = {
        # States with credit reduction for 2024
        'CA': Decimal('0.003'),  # 0.3% credit reduction
        'NY': Decimal('0.003'),  # 0.3% credit reduction
        'VI': Decimal('0.003'),  # Virgin Islands
    }
    
    # State unemployment tax credit
    MAX_STATE_CREDIT_RATE = Decimal('0.054')  # 5.4% maximum credit
    
    # FUTA deposit thresholds
    QUARTERLY_DEPOSIT_THRESHOLD = Decimal('500')  # Must deposit if quarterly liability > $500
    
    def __init__(self, tenant_id: str, year: int):
        self.tenant_id = tenant_id
        self.year = year
        self.start_date = date(year, 1, 1)
        self.end_date = date(year, 12, 31)
        self._employee_wage_data = {}
        self._state_wage_data = {}
        self._quarterly_liabilities = {1: Decimal('0'), 2: Decimal('0'), 
                                      3: Decimal('0'), 4: Decimal('0')}
        
    def calculate_form940_data(self) -> Dict[str, Any]:
        """Calculate all Form 940 data"""
        try:
            # Get employee wage data
            self._load_employee_wage_data()
            
            # Calculate FUTA wages and tax
            futa_data = self._calculate_futa_tax()
            
            # Calculate state unemployment tax credits
            state_credits = self._calculate_state_credits()
            
            # Calculate quarterly liabilities
            quarterly_data = self._calculate_quarterly_liabilities()
            
            # Prepare form data
            form_data = {
                'year': self.year,
                'ein': self._get_employer_ein(),
                'business_name': self._get_business_name(),
                'business_address': self._get_business_address(),
                
                # Part 1 - Tell us about your return
                'amended_return': False,
                'successor_employer': False,
                'no_payments_to_employees': self._check_no_payments(),
                'final_return': False,
                
                # Part 2 - Determine FUTA tax
                'total_payments': futa_data['total_payments'],
                'payments_exempt_from_futa': futa_data['exempt_payments'],
                'payments_exceeding_7000': futa_data['excess_payments'],
                'total_taxable_futa_wages': futa_data['taxable_wages'],
                
                # Part 3 - Determine adjustments
                'adjustments_to_state_contributions': Decimal('0'),
                
                # Part 4 - Calculate FUTA tax
                'futa_tax_before_adjustments': futa_data['futa_tax_before_adjustments'],
                'futa_tax_after_adjustments': futa_data['futa_tax_after_adjustments'],
                
                # Part 5 - Calculate state unemployment tax credit
                'state_contributions_paid': state_credits['total_state_tax_paid'],
                'state_taxable_wages': state_credits['state_taxable_wages'],
                'credit_reduction_states': state_credits['credit_reduction_states'],
                'total_credit_reduction': state_credits['total_credit_reduction'],
                'state_credit_allowable': state_credits['allowable_credit'],
                
                # Part 6 - Total FUTA tax
                'total_futa_tax': futa_data['total_futa_tax'],
                
                # Part 7 - Quarterly liabilities
                'first_quarter_liability': quarterly_data[1],
                'second_quarter_liability': quarterly_data[2],
                'third_quarter_liability': quarterly_data[3],
                'fourth_quarter_liability': quarterly_data[4],
                'total_tax_liability': sum(quarterly_data.values()),
                
                # Part 8 - Deposits and balance
                'total_deposits': self._get_total_deposits(),
                'balance_due': Decimal('0'),
                'overpayment': Decimal('0'),
                
                # Multi-state employer data
                'is_multi_state': len(self._state_wage_data) > 1,
                'state_details': self._prepare_schedule_a_data() if len(self._state_wage_data) > 1 else None,
                
                # Metadata
                'created_at': timezone.now(),
                'updated_at': timezone.now(),
            }
            
            # Calculate balance due or overpayment
            total_liability = form_data['total_tax_liability']
            total_deposits = form_data['total_deposits']
            
            if total_liability > total_deposits:
                form_data['balance_due'] = total_liability - total_deposits
            else:
                form_data['overpayment'] = total_deposits - total_liability
                
            return form_data
            
        except Exception as e:
            logger.error(f"Error calculating Form 940: {str(e)}")
            raise ValidationError(f"Failed to calculate Form 940 data: {str(e)}")
    
    def _load_employee_wage_data(self):
        """Load wage data for all employees for the year"""
        from payroll.models import PayrollRun, PayrollTransaction
        from hr.models import Employee
        
        payroll_transactions = PayrollTransaction.objects.filter(
            tenant_id=self.tenant_id,
            payroll_run__pay_date__year=self.year,
            payroll_run__status='completed'
        ).select_related('employee', 'payroll_run')
        
        for transaction in payroll_transactions:
            employee_id = str(transaction.employee_id)
            if employee_id not in self._employee_wage_data:
                self._employee_wage_data[employee_id] = {
                    'employee': transaction.employee,
                    'total_wages': Decimal('0'),
                    'taxable_futa_wages': Decimal('0'),
                    'quarters': {1: Decimal('0'), 2: Decimal('0'), 
                               3: Decimal('0'), 4: Decimal('0')},
                    'states': {}
                }
            
            # Track wages by quarter
            quarter = (transaction.payroll_run.pay_date.month - 1) // 3 + 1
            wage_amount = Decimal(str(transaction.gross_pay))
            
            self._employee_wage_data[employee_id]['total_wages'] += wage_amount
            self._employee_wage_data[employee_id]['quarters'][quarter] += wage_amount
            
            # Track state wages
            state = transaction.state_code if hasattr(transaction, 'state_code') else self._get_default_state()
            if state not in self._employee_wage_data[employee_id]['states']:
                self._employee_wage_data[employee_id]['states'][state] = Decimal('0')
            self._employee_wage_data[employee_id]['states'][state] += wage_amount
            
            # Calculate FUTA taxable wages (up to $7,000 per employee)
            current_futa_taxable = self._employee_wage_data[employee_id]['taxable_futa_wages']
            if current_futa_taxable < self.FUTA_WAGE_BASE:
                additional_taxable = min(
                    wage_amount,
                    self.FUTA_WAGE_BASE - current_futa_taxable
                )
                self._employee_wage_data[employee_id]['taxable_futa_wages'] += additional_taxable
    
    def _calculate_futa_tax(self) -> Dict[str, Decimal]:
        """Calculate FUTA tax amounts"""
        total_payments = Decimal('0')
        exempt_payments = Decimal('0')
        excess_payments = Decimal('0')
        taxable_wages = Decimal('0')
        
        for employee_data in self._employee_wage_data.values():
            total_payments += employee_data['total_wages']
            
            # Calculate excess wages (over $7,000)
            if employee_data['total_wages'] > self.FUTA_WAGE_BASE:
                excess_payments += employee_data['total_wages'] - self.FUTA_WAGE_BASE
            
            taxable_wages += employee_data['taxable_futa_wages']
        
        # Calculate FUTA tax before adjustments (6.0%)
        futa_tax_before_adjustments = taxable_wages * self.FUTA_RATE_BEFORE_CREDIT
        futa_tax_before_adjustments = futa_tax_before_adjustments.quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # For now, assume no adjustments
        futa_tax_after_adjustments = futa_tax_before_adjustments
        
        return {
            'total_payments': total_payments,
            'exempt_payments': exempt_payments,
            'excess_payments': excess_payments,
            'taxable_wages': taxable_wages,
            'futa_tax_before_adjustments': futa_tax_before_adjustments,
            'futa_tax_after_adjustments': futa_tax_after_adjustments,
            'total_futa_tax': Decimal('0'),  # Will be calculated after credits
        }
    
    def _calculate_state_credits(self) -> Dict[str, Any]:
        """Calculate state unemployment tax credits"""
        # Aggregate wages by state
        for employee_data in self._employee_wage_data.values():
            for state, wages in employee_data['states'].items():
                if state not in self._state_wage_data:
                    self._state_wage_data[state] = {
                        'total_wages': Decimal('0'),
                        'taxable_wages': Decimal('0'),
                        'employees': []
                    }
                
                self._state_wage_data[state]['total_wages'] += wages
                # State taxable wages limited to FUTA wage base per employee
                taxable = min(wages, self.FUTA_WAGE_BASE)
                self._state_wage_data[state]['taxable_wages'] += taxable
                self._state_wage_data[state]['employees'].append(employee_data['employee'])
        
        # Calculate state unemployment tax paid
        total_state_tax_paid = self._get_state_unemployment_tax_paid()
        
        # Calculate credit reduction for certain states
        credit_reduction_states = []
        total_credit_reduction = Decimal('0')
        
        for state, data in self._state_wage_data.items():
            if state in self.FUTA_CREDIT_REDUCTION_STATES:
                reduction_rate = self.FUTA_CREDIT_REDUCTION_STATES[state]
                reduction_amount = data['taxable_wages'] * reduction_rate
                total_credit_reduction += reduction_amount
                
                credit_reduction_states.append({
                    'state': state,
                    'taxable_wages': data['taxable_wages'],
                    'reduction_rate': reduction_rate,
                    'reduction_amount': reduction_amount
                })
        
        # Calculate allowable credit (maximum 5.4% of taxable wages)
        state_taxable_wages = sum(data['taxable_wages'] for data in self._state_wage_data.values())
        max_credit = state_taxable_wages * self.MAX_STATE_CREDIT_RATE
        
        # Actual credit is lesser of state tax paid or maximum credit
        allowable_credit = min(total_state_tax_paid, max_credit) - total_credit_reduction
        
        return {
            'total_state_tax_paid': total_state_tax_paid,
            'state_taxable_wages': state_taxable_wages,
            'credit_reduction_states': credit_reduction_states,
            'total_credit_reduction': total_credit_reduction,
            'allowable_credit': allowable_credit
        }
    
    def _calculate_quarterly_liabilities(self) -> Dict[int, Decimal]:
        """Calculate FUTA tax liability by quarter"""
        quarterly_liabilities = {1: Decimal('0'), 2: Decimal('0'), 
                               3: Decimal('0'), 4: Decimal('0')}
        
        for employee_data in self._employee_wage_data.values():
            running_total = Decimal('0')
            
            for quarter in range(1, 5):
                quarter_wages = employee_data['quarters'][quarter]
                
                # Calculate taxable wages for this quarter
                if running_total >= self.FUTA_WAGE_BASE:
                    # Already hit the limit
                    taxable_wages = Decimal('0')
                elif running_total + quarter_wages <= self.FUTA_WAGE_BASE:
                    # All wages are taxable
                    taxable_wages = quarter_wages
                else:
                    # Hit the limit this quarter
                    taxable_wages = self.FUTA_WAGE_BASE - running_total
                
                # Calculate FUTA tax for this quarter (0.6% after full credit)
                quarter_tax = taxable_wages * self.FUTA_RATE
                quarterly_liabilities[quarter] += quarter_tax
                
                running_total += quarter_wages
        
        # Round quarterly liabilities
        for quarter in quarterly_liabilities:
            quarterly_liabilities[quarter] = quarterly_liabilities[quarter].quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
        
        return quarterly_liabilities
    
    def _prepare_schedule_a_data(self) -> List[Dict[str, Any]]:
        """Prepare data for Schedule A (Multi-State Employer)"""
        schedule_a_data = []
        
        for state, data in self._state_wage_data.items():
            state_info = {
                'state_code': state,
                'state_ein': self._get_state_ein(state),
                'taxable_wages': data['taxable_wages'],
                'state_experience_rate': self._get_state_experience_rate(state),
                'state_unemployment_tax_paid': self._get_state_tax_paid(state),
                'additional_contributions': Decimal('0'),
                'total_contributions': self._get_state_tax_paid(state),
                'is_credit_reduction_state': state in self.FUTA_CREDIT_REDUCTION_STATES,
                'credit_reduction_rate': self.FUTA_CREDIT_REDUCTION_STATES.get(state, Decimal('0'))
            }
            schedule_a_data.append(state_info)
        
        return schedule_a_data
    
    def validate_form940(self, form_data: Dict[str, Any]) -> List[str]:
        """Validate Form 940 data"""
        errors = []
        
        # Check required fields
        if not form_data.get('ein'):
            errors.append("Employer Identification Number (EIN) is required")
        
        if not form_data.get('business_name'):
            errors.append("Business name is required")
        
        # Validate calculations
        total_payments = form_data.get('total_payments', Decimal('0'))
        exempt_payments = form_data.get('payments_exempt_from_futa', Decimal('0'))
        excess_payments = form_data.get('payments_exceeding_7000', Decimal('0'))
        taxable_wages = form_data.get('total_taxable_futa_wages', Decimal('0'))
        
        # Check that taxable wages calculation is correct
        calculated_taxable = total_payments - exempt_payments - excess_payments
        if abs(calculated_taxable - taxable_wages) > Decimal('0.01'):
            errors.append("Taxable FUTA wages calculation is incorrect")
        
        # Validate quarterly liabilities sum to total
        quarterly_sum = (
            form_data.get('first_quarter_liability', Decimal('0')) +
            form_data.get('second_quarter_liability', Decimal('0')) +
            form_data.get('third_quarter_liability', Decimal('0')) +
            form_data.get('fourth_quarter_liability', Decimal('0'))
        )
        total_liability = form_data.get('total_tax_liability', Decimal('0'))
        
        if abs(quarterly_sum - total_liability) > Decimal('0.01'):
            errors.append("Quarterly liabilities do not sum to total tax liability")
        
        # Check deposit requirements
        for quarter in range(1, 5):
            quarter_key = ['first', 'second', 'third', 'fourth'][quarter-1]
            liability = form_data.get(f'{quarter_key}_quarter_liability', Decimal('0'))
            
            if liability > self.QUARTERLY_DEPOSIT_THRESHOLD:
                # Should have made quarterly deposits
                pass  # Additional validation for deposit records could go here
        
        return errors
    
    def generate_amended_return(self, original_form_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
        """Generate Form 940-X for amended returns"""
        # Load original form data
        from taxes.models import Form940
        original_form = Form940.objects.get(id=original_form_id, tenant_id=self.tenant_id)
        
        # Apply changes
        amended_data = self.calculate_form940_data()
        amended_data['amended_return'] = True
        amended_data['original_form_id'] = original_form_id
        
        # Calculate differences
        differences = {}
        for key in ['total_payments', 'total_taxable_futa_wages', 'total_futa_tax']:
            original_value = getattr(original_form, key, Decimal('0'))
            amended_value = amended_data.get(key, Decimal('0'))
            differences[key] = {
                'original': original_value,
                'amended': amended_value,
                'difference': amended_value - original_value
            }
        
        amended_data['differences'] = differences
        amended_data['amendment_reason'] = changes.get('reason', '')
        
        return amended_data
    
    # Helper methods
    def _get_employer_ein(self) -> str:
        """Get employer EIN"""
        from taxes.models import EmployerTaxAccount
        try:
            account = EmployerTaxAccount.objects.get(
                tenant_id=self.tenant_id,
                is_active=True
            )
            return account.ein
        except EmployerTaxAccount.DoesNotExist:
            return ""
    
    def _get_business_name(self) -> str:
        """Get business name"""
        from custom_auth.models import Tenant
        try:
            tenant = Tenant.objects.get(id=self.tenant_id)
            return tenant.company_name
        except:
            return ""
    
    def _get_business_address(self) -> Dict[str, str]:
        """Get business address"""
        from custom_auth.models import Tenant
        try:
            tenant = Tenant.objects.get(id=self.tenant_id)
            return {
                'street': getattr(tenant, 'street_address', ''),
                'city': getattr(tenant, 'city', ''),
                'state': getattr(tenant, 'state', ''),
                'zip_code': getattr(tenant, 'zip_code', '')
            }
        except:
            return {}
    
    def _check_no_payments(self) -> bool:
        """Check if no payments were made to employees"""
        return len(self._employee_wage_data) == 0
    
    def _get_default_state(self) -> str:
        """Get default state for the business"""
        address = self._get_business_address()
        return address.get('state', 'CA')  # Default to CA if not found
    
    def _get_state_unemployment_tax_paid(self) -> Decimal:
        """Get total state unemployment tax paid for the year"""
        # This would query actual state tax payment records
        # For now, return a calculated estimate
        total = Decimal('0')
        for state, data in self._state_wage_data.items():
            rate = self._get_state_experience_rate(state)
            total += data['taxable_wages'] * rate
        return total
    
    def _get_state_tax_paid(self, state: str) -> Decimal:
        """Get state unemployment tax paid for a specific state"""
        if state not in self._state_wage_data:
            return Decimal('0')
        
        rate = self._get_state_experience_rate(state)
        return self._state_wage_data[state]['taxable_wages'] * rate
    
    def _get_state_experience_rate(self, state: str) -> Decimal:
        """Get state unemployment experience rate"""
        # This would look up actual rates from state tax accounts
        # Default rates for demonstration
        default_rates = {
            'CA': Decimal('0.034'),  # 3.4%
            'NY': Decimal('0.041'),  # 4.1%
            'TX': Decimal('0.026'),  # 2.6%
            'FL': Decimal('0.027'),  # 2.7%
        }
        return default_rates.get(state, Decimal('0.030'))  # Default 3.0%
    
    def _get_state_ein(self, state: str) -> str:
        """Get state employer identification number"""
        from taxes.models import StateTaxAccount
        try:
            account = StateTaxAccount.objects.get(
                tenant_id=self.tenant_id,
                state_code=state,
                is_active=True
            )
            return account.state_employer_number
        except:
            return ""
    
    def _get_total_deposits(self) -> Decimal:
        """Get total FUTA deposits made for the year"""
        from taxes.models import PayrollTaxDeposit
        
        deposits = PayrollTaxDeposit.objects.filter(
            tenant_id=self.tenant_id,
            tax_type='FUTA',
            deposit_date__year=self.year,
            status='completed'
        ).aggregate(total=Sum('amount'))
        
        return deposits['total'] or Decimal('0')