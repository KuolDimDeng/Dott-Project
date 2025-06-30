"""
State Payroll Tax Processor

Handles state-specific payroll tax calculations including:
- State income tax withholding
- State unemployment insurance (SUI)
- State disability insurance (SDI)
- State family leave insurance
- Local taxes where applicable
"""

import logging
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from datetime import date, datetime
from django.db import transaction
from django.utils import timezone

from payroll.models import PayrollRun, PayrollTransaction
from hr.models import Employee
from taxes.models import (
    StateTaxAccount, StateFilingRequirement, 
    PayrollTaxFiling, TaxApiTransaction
)

logger = logging.getLogger(__name__)


class StatePayrollProcessor:
    """Main processor for state payroll taxes"""
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.handlers = {}
        self._load_handlers()
    
    def _load_handlers(self):
        """Dynamically load state-specific handlers"""
        from .state_handlers.california import CaliforniaPayrollHandler
        from .state_handlers.new_york import NewYorkPayrollHandler
        from .state_handlers.texas import TexasPayrollHandler
        from .state_handlers.florida import FloridaPayrollHandler
        from .state_handlers.pennsylvania import PennsylvaniaPayrollHandler
        from .state_handlers.illinois import IllinoisPayrollHandler
        
        self.handlers = {
            'CA': CaliforniaPayrollHandler(self.tenant_id),
            'NY': NewYorkPayrollHandler(self.tenant_id),
            'TX': TexasPayrollHandler(self.tenant_id),
            'FL': FloridaPayrollHandler(self.tenant_id),
            'PA': PennsylvaniaPayrollHandler(self.tenant_id),
            'IL': IllinoisPayrollHandler(self.tenant_id),
        }
    
    def process_payroll_run(self, payroll_run: PayrollRun) -> Dict[str, any]:
        """Process state taxes for an entire payroll run"""
        results = {
            'success': True,
            'state_taxes': {},
            'errors': [],
            'warnings': []
        }
        
        try:
            # Group employees by state
            employees_by_state = self._group_employees_by_state(payroll_run)
            
            # Process each state
            for state_code, employees in employees_by_state.items():
                if state_code in self.handlers:
                    state_result = self._process_state(
                        state_code, 
                        employees, 
                        payroll_run
                    )
                    results['state_taxes'][state_code] = state_result
                else:
                    results['warnings'].append(
                        f"No handler configured for state {state_code}"
                    )
            
            # Generate quarterly filings if needed
            self._check_quarterly_filings(payroll_run, results)
            
        except Exception as e:
            logger.error(f"Error processing state payroll taxes: {str(e)}")
            results['success'] = False
            results['errors'].append(str(e))
        
        return results
    
    def _group_employees_by_state(self, payroll_run: PayrollRun) -> Dict[str, List]:
        """Group employees by their work state"""
        employees_by_state = {}
        
        transactions = PayrollTransaction.objects.filter(
            payroll_run=payroll_run,
            tenant_id=self.tenant_id
        ).select_related('employee')
        
        for transaction in transactions:
            employee = transaction.employee
            # Get work state from employee's work address
            state_code = getattr(employee, 'work_state', None) or \
                        getattr(employee, 'state', None) or \
                        transaction.state_code
            
            if state_code:
                if state_code not in employees_by_state:
                    employees_by_state[state_code] = []
                employees_by_state[state_code].append({
                    'employee': employee,
                    'transaction': transaction
                })
        
        return employees_by_state
    
    def _process_state(self, state_code: str, employees: List, 
                      payroll_run: PayrollRun) -> Dict:
        """Process taxes for a specific state"""
        handler = self.handlers[state_code]
        state_result = {
            'state_code': state_code,
            'total_wages': Decimal('0'),
            'total_withholding': Decimal('0'),
            'sui_wages': Decimal('0'),
            'sui_tax': Decimal('0'),
            'sdi_tax': Decimal('0'),
            'other_taxes': {},
            'employee_details': []
        }
        
        # Get state account info
        state_account = self._get_state_account(state_code)
        
        for emp_data in employees:
            employee = emp_data['employee']
            transaction = emp_data['transaction']
            
            # Calculate state withholding
            withholding = handler.calculate_state_withholding(
                employee, 
                transaction.gross_pay,
                payroll_run.pay_date
            )
            
            # Calculate employer taxes
            employer_taxes = handler.calculate_employer_taxes(
                employee,
                transaction.gross_pay,
                payroll_run.pay_date,
                state_account
            )
            
            # Calculate employee taxes
            employee_taxes = handler.calculate_employee_taxes(
                employee,
                transaction.gross_pay,
                payroll_run.pay_date
            )
            
            # Update transaction with state tax info
            transaction.state_tax = withholding
            transaction.state_code = state_code
            transaction.save()
            
            # Accumulate totals
            state_result['total_wages'] += transaction.gross_pay
            state_result['total_withholding'] += withholding
            state_result['sui_wages'] += employer_taxes.get('sui_wages', Decimal('0'))
            state_result['sui_tax'] += employer_taxes.get('sui_tax', Decimal('0'))
            state_result['sdi_tax'] += employee_taxes.get('sdi_tax', Decimal('0'))
            
            # Store employee details
            state_result['employee_details'].append({
                'employee_id': employee.id,
                'employee_name': employee.full_name,
                'gross_pay': transaction.gross_pay,
                'state_withholding': withholding,
                'employer_taxes': employer_taxes,
                'employee_taxes': employee_taxes
            })
        
        return state_result
    
    def _get_state_account(self, state_code: str) -> Optional[StateTaxAccount]:
        """Get state tax account information"""
        try:
            return StateTaxAccount.objects.get(
                tenant_id=self.tenant_id,
                state_code=state_code,
                is_active=True
            )
        except StateTaxAccount.DoesNotExist:
            logger.warning(f"No state tax account found for {state_code}")
            return None
    
    def _check_quarterly_filings(self, payroll_run: PayrollRun, results: Dict):
        """Check if quarterly filings are needed"""
        pay_date = payroll_run.pay_date
        quarter = (pay_date.month - 1) // 3 + 1
        
        # Check if this is the last payroll of the quarter
        next_month = pay_date.month + 1
        if next_month > 12:
            next_month = 1
        
        if next_month % 3 == 1:  # First month of new quarter
            # Generate quarterly filings
            for state_code, state_data in results['state_taxes'].items():
                if state_code in self.handlers:
                    filing = self._create_quarterly_filing(
                        state_code, 
                        quarter, 
                        pay_date.year,
                        state_data
                    )
                    if filing:
                        results['state_taxes'][state_code]['quarterly_filing'] = filing.id
    
    def _create_quarterly_filing(self, state_code: str, quarter: int, 
                               year: int, state_data: Dict) -> Optional[PayrollTaxFiling]:
        """Create a quarterly state tax filing"""
        try:
            quarter_start = date(year, (quarter - 1) * 3 + 1, 1)
            if quarter == 4:
                quarter_end = date(year, 12, 31)
            else:
                quarter_end = date(year, quarter * 3 + 1, 1) - timezone.timedelta(days=1)
            
            filing = PayrollTaxFiling.objects.create(
                tenant_id=self.tenant_id,
                state_id=state_code,  # Assuming State model exists
                business_id=self.tenant_id,
                payroll_run=f"Q{quarter}-{year}",
                filing_period_start=quarter_start,
                filing_period_end=quarter_end,
                filing_status='preparation',
                total_wages=state_data['total_wages'],
                total_withholding=state_data['total_withholding'],
                submission_method='api',
                notes=f"Quarterly filing for {state_code} Q{quarter} {year}"
            )
            
            logger.info(f"Created quarterly filing {filing.id} for {state_code}")
            return filing
            
        except Exception as e:
            logger.error(f"Error creating quarterly filing: {str(e)}")
            return None
    
    def validate_employer_accounts(self) -> Dict[str, List[str]]:
        """Validate all state employer accounts"""
        validation_results = {
            'valid': [],
            'invalid': [],
            'missing': []
        }
        
        # Get all active state accounts
        state_accounts = StateTaxAccount.objects.filter(
            tenant_id=self.tenant_id,
            is_active=True
        )
        
        for account in state_accounts:
            if account.state_code in self.handlers:
                handler = self.handlers[account.state_code]
                is_valid, message = handler.validate_employer_account(account)
                
                if is_valid:
                    validation_results['valid'].append(account.state_code)
                else:
                    validation_results['invalid'].append({
                        'state': account.state_code,
                        'message': message
                    })
            else:
                validation_results['missing'].append(account.state_code)
        
        return validation_results
    
    def generate_state_forms(self, state_code: str, period_start: date, 
                           period_end: date) -> Dict[str, any]:
        """Generate state-specific tax forms"""
        if state_code not in self.handlers:
            return {
                'success': False,
                'error': f"No handler for state {state_code}"
            }
        
        handler = self.handlers[state_code]
        return handler.generate_state_forms(period_start, period_end)
    
    def handle_multi_state_employer(self, employee: Employee, 
                                  states_worked: List[Tuple[str, Decimal]]) -> Dict:
        """Handle employees working in multiple states"""
        results = {
            'allocations': {},
            'total_withholding': Decimal('0'),
            'reciprocity_applied': []
        }
        
        for state_code, wages in states_worked:
            if state_code in self.handlers:
                handler = self.handlers[state_code]
                
                # Check for reciprocity agreements
                reciprocity = handler.check_reciprocity(
                    employee.residence_state,
                    state_code
                )
                
                if reciprocity:
                    results['reciprocity_applied'].append({
                        'work_state': state_code,
                        'residence_state': employee.residence_state,
                        'agreement': reciprocity
                    })
                    # Tax in residence state instead
                    state_code = employee.residence_state
                    handler = self.handlers.get(state_code)
                
                if handler:
                    withholding = handler.calculate_state_withholding(
                        employee, 
                        wages,
                        datetime.now().date()
                    )
                    
                    results['allocations'][state_code] = {
                        'wages': wages,
                        'withholding': withholding
                    }
                    results['total_withholding'] += withholding
        
        return results
    
    def get_state_tax_deposits(self, state_code: str, year: int, 
                             quarter: int) -> List[Dict]:
        """Get state tax deposits for a period"""
        if state_code not in self.handlers:
            return []
        
        handler = self.handlers[state_code]
        return handler.get_tax_deposits(year, quarter)
    
    def submit_state_filing(self, filing_id: str) -> Dict[str, any]:
        """Submit a state tax filing electronically"""
        try:
            filing = PayrollTaxFiling.objects.get(
                id=filing_id,
                tenant_id=self.tenant_id
            )
            
            state_code = filing.state.code
            if state_code not in self.handlers:
                return {
                    'success': False,
                    'error': f"No handler for state {state_code}"
                }
            
            handler = self.handlers[state_code]
            result = handler.submit_filing(filing)
            
            # Log API transaction
            TaxApiTransaction.objects.create(
                tenant_id=self.tenant_id,
                state_id=filing.state_id,
                endpoint=result.get('endpoint', 'state_filing'),
                request_payload=result.get('request', '{}'),
                response_payload=result.get('response', '{}'),
                status_code=result.get('status_code', 0),
                success=result.get('success', False),
                error_message=result.get('error'),
                processing_time_ms=result.get('processing_time', 0)
            )
            
            return result
            
        except PayrollTaxFiling.DoesNotExist:
            return {
                'success': False,
                'error': 'Filing not found'
            }
        except Exception as e:
            logger.error(f"Error submitting state filing: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }


class BaseStatePayrollHandler:
    """Base class for state-specific payroll handlers"""
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.state_code = None
        self.state_name = None
    
    def calculate_state_withholding(self, employee: Employee, 
                                  gross_pay: Decimal, 
                                  pay_date: date) -> Decimal:
        """Calculate state income tax withholding"""
        raise NotImplementedError
    
    def calculate_employer_taxes(self, employee: Employee, 
                               gross_pay: Decimal,
                               pay_date: date,
                               state_account: Optional[StateTaxAccount]) -> Dict:
        """Calculate employer-paid state taxes"""
        raise NotImplementedError
    
    def calculate_employee_taxes(self, employee: Employee,
                               gross_pay: Decimal,
                               pay_date: date) -> Dict:
        """Calculate employee-paid state taxes (besides income tax)"""
        return {}
    
    def validate_employer_account(self, account: StateTaxAccount) -> Tuple[bool, str]:
        """Validate employer account number format"""
        if not account.state_employer_number:
            return False, "Missing state employer number"
        return True, "Valid"
    
    def check_reciprocity(self, residence_state: str, work_state: str) -> Optional[Dict]:
        """Check for reciprocity agreements between states"""
        return None
    
    def generate_state_forms(self, period_start: date, period_end: date) -> Dict:
        """Generate state-specific forms"""
        return {
            'success': False,
            'error': 'Not implemented for this state'
        }
    
    def submit_filing(self, filing: PayrollTaxFiling) -> Dict:
        """Submit filing to state tax authority"""
        return {
            'success': False,
            'error': 'Electronic filing not available for this state'
        }
    
    def get_tax_deposits(self, year: int, quarter: int) -> List[Dict]:
        """Get tax deposits for the period"""
        return []
    
    def get_wage_base(self, year: int, tax_type: str) -> Decimal:
        """Get wage base limit for a specific tax type"""
        wage_bases = {
            'SUI': {},  # State unemployment insurance
            'SDI': {},  # State disability insurance
            'PFML': {}, # Paid family and medical leave
        }
        return wage_bases.get(tax_type, {}).get(self.state_code, {}).get(year, Decimal('0'))