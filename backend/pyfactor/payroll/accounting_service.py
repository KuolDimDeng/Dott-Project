"""
Payroll Accounting Service
Handles IFRS and GAAP specific accounting for payroll transactions
"""

from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from finance.models import JournalEntry, JournalEntryLine, ChartOfAccount
from pyfactor.logging_config import get_logger
from accounting.services import AccountingStandardsService
from users.models import BusinessDetails

logger = get_logger()


class PayrollAccountingService:
    """
    Service class for handling payroll accounting with IFRS/GAAP compliance
    """
    
    # Account mappings for payroll
    ACCOUNT_MAPPINGS = {
        'wage_expense': 'Wage Expense',
        'payroll_tax_expense': 'Payroll Tax Expense',
        'payroll_liabilities': 'Payroll Liabilities',
        'cash': 'Cash',
        'federal_tax_payable': 'Federal Tax Payable',
        'state_tax_payable': 'State Tax Payable',
        'social_security_payable': 'Social Security Payable',
        'medicare_payable': 'Medicare Payable',
        'employee_benefits_expense': 'Employee Benefits Expense',
        'pension_expense': 'Pension Expense',
        'pension_liability': 'Pension Liability',
        'compensated_absences': 'Compensated Absences Liability',
        'vacation_expense': 'Vacation Expense'
    }
    
    @staticmethod
    def create_payroll_journal_entry(payroll_run, payroll_transactions, business_id=None):
        """
        Create journal entry for payroll with IFRS/GAAP specific handling
        
        Key IFRS/GAAP differences:
        1. Employee benefits recognition timing
        2. Pension/retirement benefit accounting
        3. Compensated absences (vacation, sick leave)
        4. Stock-based compensation
        """
        try:
            with transaction.atomic():
                # Get accounting standard
                accounting_standard = 'IFRS'  # Default
                if business_id:
                    accounting_standard = AccountingStandardsService.get_business_accounting_standard(business_id)
                
                # Create journal entry
                journal_entry = JournalEntry.objects.create(
                    date=payroll_run.pay_date,
                    description=f"Payroll for period {payroll_run.start_date} to {payroll_run.end_date}",
                    reference=f"PR-{payroll_run.id}",
                    created_by=payroll_run.created_by if hasattr(payroll_run, 'created_by') else None
                )
                
                # Initialize totals
                total_gross_pay = Decimal('0.00')
                total_net_pay = Decimal('0.00')
                total_federal_tax = Decimal('0.00')
                total_state_tax = Decimal('0.00')
                total_social_security = Decimal('0.00')
                total_medicare = Decimal('0.00')
                total_employee_deductions = Decimal('0.00')
                total_employer_taxes = Decimal('0.00')
                
                # Process each payroll transaction
                for transaction in payroll_transactions:
                    total_gross_pay += transaction.gross_pay
                    total_net_pay += transaction.net_pay
                    total_federal_tax += transaction.federal_tax_withheld
                    total_state_tax += transaction.state_tax_withheld
                    total_social_security += transaction.social_security_withheld
                    total_medicare += transaction.medicare_withheld
                    
                    # Calculate employer portions
                    employer_ss = transaction.social_security_withheld  # Employer matches
                    employer_medicare = transaction.medicare_withheld    # Employer matches
                    total_employer_taxes += employer_ss + employer_medicare
                
                # 1. Debit Wage Expense for gross pay
                wage_expense_account = PayrollAccountingService._get_or_create_account('wage_expense')
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=wage_expense_account,
                    description="Employee wages",
                    debit_amount=total_gross_pay,
                    credit_amount=Decimal('0.00')
                )
                
                # 2. Debit Payroll Tax Expense for employer portion
                if total_employer_taxes > 0:
                    tax_expense_account = PayrollAccountingService._get_or_create_account('payroll_tax_expense')
                    JournalEntryLine.objects.create(
                        journal_entry=journal_entry,
                        account=tax_expense_account,
                        description="Employer payroll taxes",
                        debit_amount=total_employer_taxes,
                        credit_amount=Decimal('0.00')
                    )
                
                # 3. Credit various payables
                # Federal tax payable
                if total_federal_tax > 0:
                    federal_tax_account = PayrollAccountingService._get_or_create_account('federal_tax_payable')
                    JournalEntryLine.objects.create(
                        journal_entry=journal_entry,
                        account=federal_tax_account,
                        description="Federal tax withheld",
                        debit_amount=Decimal('0.00'),
                        credit_amount=total_federal_tax
                    )
                
                # State tax payable
                if total_state_tax > 0:
                    state_tax_account = PayrollAccountingService._get_or_create_account('state_tax_payable')
                    JournalEntryLine.objects.create(
                        journal_entry=journal_entry,
                        account=state_tax_account,
                        description="State tax withheld",
                        debit_amount=Decimal('0.00'),
                        credit_amount=total_state_tax
                    )
                
                # Social Security payable (employee + employer)
                if total_social_security > 0:
                    ss_account = PayrollAccountingService._get_or_create_account('social_security_payable')
                    JournalEntryLine.objects.create(
                        journal_entry=journal_entry,
                        account=ss_account,
                        description="Social Security (employee + employer)",
                        debit_amount=Decimal('0.00'),
                        credit_amount=total_social_security * 2  # Employee + employer
                    )
                
                # Medicare payable (employee + employer)
                if total_medicare > 0:
                    medicare_account = PayrollAccountingService._get_or_create_account('medicare_payable')
                    JournalEntryLine.objects.create(
                        journal_entry=journal_entry,
                        account=medicare_account,
                        description="Medicare (employee + employer)",
                        debit_amount=Decimal('0.00'),
                        credit_amount=total_medicare * 2  # Employee + employer
                    )
                
                # 4. Credit Cash for net pay
                cash_account = PayrollAccountingService._get_or_create_account('cash')
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=cash_account,
                    description="Net pay to employees",
                    debit_amount=Decimal('0.00'),
                    credit_amount=total_net_pay
                )
                
                # Handle IFRS vs GAAP specific items
                PayrollAccountingService._handle_accounting_standard_specifics(
                    journal_entry, payroll_run, payroll_transactions, accounting_standard
                )
                
                # Post the journal entry
                journal_entry.post()
                
                logger.info(f"Created payroll journal entry {journal_entry.id} for payroll run {payroll_run.id}")
                return journal_entry
                
        except Exception as e:
            logger.error(f"Error creating payroll journal entry: {str(e)}")
            raise ValidationError(f"Failed to create payroll accounting entries: {str(e)}")
    
    @staticmethod
    def _handle_accounting_standard_specifics(journal_entry, payroll_run, transactions, accounting_standard):
        """
        Handle IFRS vs GAAP specific accounting treatments
        """
        # Calculate vacation/PTO accruals
        total_vacation_accrual = Decimal('0.00')
        for transaction in transactions:
            if hasattr(transaction, 'vacation_hours_earned'):
                # Estimate vacation accrual (simplified)
                hourly_rate = transaction.gross_pay / (transaction.regular_hours + transaction.overtime_hours)
                vacation_value = transaction.vacation_hours_earned * hourly_rate
                total_vacation_accrual += vacation_value
        
        if total_vacation_accrual > 0:
            # IFRS vs GAAP treatment of compensated absences
            if accounting_standard == 'IFRS':
                # IFRS requires accrual for all compensated absences
                vacation_expense_account = PayrollAccountingService._get_or_create_account('vacation_expense')
                compensated_absences_account = PayrollAccountingService._get_or_create_account('compensated_absences')
                
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=vacation_expense_account,
                    description="Vacation accrual expense (IFRS)",
                    debit_amount=total_vacation_accrual,
                    credit_amount=Decimal('0.00')
                )
                
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=compensated_absences_account,
                    description="Compensated absences liability (IFRS)",
                    debit_amount=Decimal('0.00'),
                    credit_amount=total_vacation_accrual
                )
            else:  # GAAP
                # GAAP only requires accrual if payment is probable
                # For simplicity, we're assuming it's probable
                vacation_expense_account = PayrollAccountingService._get_or_create_account('vacation_expense')
                compensated_absences_account = PayrollAccountingService._get_or_create_account('compensated_absences')
                
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=vacation_expense_account,
                    description="Vacation accrual expense (GAAP - probable)",
                    debit_amount=total_vacation_accrual,
                    credit_amount=Decimal('0.00')
                )
                
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=compensated_absences_account,
                    description="Compensated absences liability (GAAP)",
                    debit_amount=Decimal('0.00'),
                    credit_amount=total_vacation_accrual
                )
    
    @staticmethod
    def _get_or_create_account(account_key):
        """Get or create an account based on the account key"""
        account_name = PayrollAccountingService.ACCOUNT_MAPPINGS.get(account_key, account_key.title())
        
        try:
            account = ChartOfAccount.objects.filter(name=account_name).first()
            if not account:
                # Determine account category and number
                account_configs = {
                    'wage_expense': ('5100', 'Operating Expenses'),
                    'payroll_tax_expense': ('5110', 'Operating Expenses'),
                    'payroll_liabilities': ('2300', 'Current Liabilities'),
                    'cash': ('1000', 'Current Assets'),
                    'federal_tax_payable': ('2310', 'Current Liabilities'),
                    'state_tax_payable': ('2311', 'Current Liabilities'),
                    'social_security_payable': ('2312', 'Current Liabilities'),
                    'medicare_payable': ('2313', 'Current Liabilities'),
                    'employee_benefits_expense': ('5120', 'Operating Expenses'),
                    'pension_expense': ('5130', 'Operating Expenses'),
                    'pension_liability': ('2400', 'Long-term Liabilities'),
                    'compensated_absences': ('2320', 'Current Liabilities'),
                    'vacation_expense': ('5140', 'Operating Expenses')
                }
                
                account_number, category_name = account_configs.get(account_key, ('9999', 'Other'))
                
                from finance.models import AccountCategory
                category, _ = AccountCategory.objects.get_or_create(
                    name=category_name,
                    defaults={'code': category_name.upper().replace(' ', '_')}
                )
                
                account = ChartOfAccount.objects.create(
                    account_number=account_number,
                    name=account_name,
                    description=f"{account_name} account for payroll",
                    category=category,
                    is_active=True
                )
                
                logger.info(f"Created new payroll account: {account_number} - {account_name}")
            
            return account
            
        except Exception as e:
            logger.error(f"Error getting/creating account {account_name}: {e}")
            raise
    
    @staticmethod
    def create_payroll_tax_remittance_entry(tax_payment, business_id=None):
        """
        Create journal entry for payroll tax remittance
        """
        try:
            with transaction.atomic():
                # Create journal entry
                journal_entry = JournalEntry.objects.create(
                    date=tax_payment.payment_date,
                    description=f"Payroll tax remittance - {tax_payment.tax_type}",
                    reference=f"TAX-{tax_payment.id}",
                    created_by=tax_payment.created_by if hasattr(tax_payment, 'created_by') else None
                )
                
                # Debit the tax payable account
                tax_payable_key = f"{tax_payment.tax_type.lower()}_tax_payable"
                tax_payable_account = PayrollAccountingService._get_or_create_account(tax_payable_key)
                
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=tax_payable_account,
                    description=f"{tax_payment.tax_type} tax payment",
                    debit_amount=tax_payment.amount,
                    credit_amount=Decimal('0.00')
                )
                
                # Credit cash
                cash_account = PayrollAccountingService._get_or_create_account('cash')
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=cash_account,
                    description=f"Payment for {tax_payment.tax_type} taxes",
                    debit_amount=Decimal('0.00'),
                    credit_amount=tax_payment.amount
                )
                
                # Post the journal entry
                journal_entry.post()
                
                logger.info(f"Created tax remittance journal entry {journal_entry.id}")
                return journal_entry
                
        except Exception as e:
            logger.error(f"Error creating tax remittance journal entry: {str(e)}")
            raise ValidationError(f"Failed to create tax remittance accounting entries: {str(e)}")