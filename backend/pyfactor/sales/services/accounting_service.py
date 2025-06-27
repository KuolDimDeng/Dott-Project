"""
Accounting Service for POS Operations
Handles automatic journal entries for sales, payments, and refunds.
"""

from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from finance.models import JournalEntry, JournalEntryLine, ChartOfAccount, Account
from pyfactor.logging_config import get_logger

logger = get_logger()


class AccountingService:
    """
    Service class for managing accounting operations during POS transactions.
    Follows double-entry bookkeeping principles.
    """
    
    # Standard account names/codes
    ACCOUNT_MAPPINGS = {
        'cash': ['Cash', 'Cash on Hand', 'Petty Cash'],
        'accounts_receivable': ['Accounts Receivable', 'AR', 'Trade Receivables'],
        'sales_revenue': ['Sales Revenue', 'Sales', 'Revenue', 'Income'],
        'sales_tax_payable': ['Sales Tax Payable', 'Tax Payable', 'Sales Tax'],
        'cost_of_goods_sold': ['Cost of Goods Sold', 'COGS', 'Cost of Sales'],
        'inventory': ['Inventory', 'Stock', 'Merchandise Inventory'],
        'customer_deposits': ['Customer Deposits', 'Advance Payments', 'Prepayments'],
    }
    
    @staticmethod
    def get_or_create_account(account_type, business=None):
        """
        Get or create a standard account for the business.
        
        Args:
            account_type: Type of account ('cash', 'sales_revenue', etc.)
            business: Business instance (for multi-tenant)
            
        Returns:
            ChartOfAccount instance
        """
        possible_names = AccountingService.ACCOUNT_MAPPINGS.get(account_type, [account_type.title()])
        
        # Try to find existing account
        for name in possible_names:
            try:
                account = ChartOfAccount.objects.filter(name__icontains=name).first()
                if account:
                    return account
            except ChartOfAccount.DoesNotExist:
                continue
        
        # Create default account if not found
        default_name = possible_names[0]
        logger.warning(f"Creating default account: {default_name}")
        
        # Determine account category based on type
        category_mappings = {
            'cash': 'Current Assets',
            'accounts_receivable': 'Current Assets',
            'sales_revenue': 'Revenue',
            'sales_tax_payable': 'Current Liabilities',
            'cost_of_goods_sold': 'Cost of Goods Sold',
            'inventory': 'Current Assets',
            'customer_deposits': 'Current Liabilities',
        }
        
        # Try to get or create account category
        from finance.models import AccountCategory
        category_name = category_mappings.get(account_type, 'Other')
        category, created = AccountCategory.objects.get_or_create(
            name=category_name,
            defaults={'code': category_name.upper().replace(' ', '_')}
        )
        
        # Generate account number (simple sequential)
        last_account = ChartOfAccount.objects.order_by('-account_number').first()
        if last_account and last_account.account_number.isdigit():
            next_number = str(int(last_account.account_number) + 1)
        else:
            # Default numbering scheme
            number_mappings = {
                'cash': '1001',
                'accounts_receivable': '1200',
                'inventory': '1300',
                'sales_revenue': '4000',
                'cost_of_goods_sold': '5000',
                'sales_tax_payable': '2200',
                'customer_deposits': '2300',
            }
            next_number = number_mappings.get(account_type, '9999')
        
        account = ChartOfAccount.objects.create(
            account_number=next_number,
            name=default_name,
            description=f"Auto-created {default_name} account for POS transactions",
            category=category,
            is_active=True
        )
        
        logger.info(f"Created new account: {account.account_number} - {account.name}")
        return account
    
    @staticmethod
    def create_sale_journal_entry(pos_transaction, items_data):
        """
        Create journal entries for a completed POS sale.
        
        Journal Entry Structure:
        - Debit: Cash/Accounts Receivable (based on payment method)
        - Credit: Sales Revenue (main sale amount)
        - Credit: Sales Tax Payable (if tax applied)
        - Debit: Cost of Goods Sold (for products)
        - Credit: Inventory (for products)
        
        Args:
            pos_transaction: POSTransaction instance
            items_data: List of transaction items with cost data
            
        Returns:
            JournalEntry instance
        """
        try:
            with transaction.atomic():
                # Create the main journal entry
                journal_entry = JournalEntry.objects.create(
                    date=pos_transaction.created_at.date(),
                    description=f"POS Sale - {pos_transaction.transaction_number}",
                    reference=pos_transaction.transaction_number,
                    business=getattr(pos_transaction, 'business', None),
                    created_by=pos_transaction.created_by
                )
                
                # Get required accounts
                if pos_transaction.payment_method == 'cash':
                    debit_account = AccountingService.get_or_create_account('cash')
                else:
                    debit_account = AccountingService.get_or_create_account('accounts_receivable')
                
                sales_revenue_account = AccountingService.get_or_create_account('sales_revenue')
                sales_tax_account = AccountingService.get_or_create_account('sales_tax_payable')
                cogs_account = AccountingService.get_or_create_account('cost_of_goods_sold')
                inventory_account = AccountingService.get_or_create_account('inventory')
                
                # 1. Debit Cash/AR for total amount received
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=debit_account,
                    description=f"Sale payment - {pos_transaction.payment_method}",
                    debit_amount=pos_transaction.total_amount,
                    credit_amount=Decimal('0.00')
                )
                
                # 2. Credit Sales Revenue for subtotal (excluding tax)
                revenue_amount = pos_transaction.subtotal - pos_transaction.discount_amount
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=sales_revenue_account,
                    description=f"Sales revenue",
                    debit_amount=Decimal('0.00'),
                    credit_amount=revenue_amount
                )
                
                # 3. Credit Sales Tax Payable (if any tax)
                if pos_transaction.tax_total > 0:
                    JournalEntryLine.objects.create(
                        journal_entry=journal_entry,
                        account=sales_tax_account,
                        description=f"Sales tax collected",
                        debit_amount=Decimal('0.00'),
                        credit_amount=pos_transaction.tax_total
                    )
                
                # 4. Cost of Goods Sold entries (for products only)
                total_cogs = Decimal('0.00')
                for item in items_data:
                    if item['type'] == 'product' and 'cost_price' in item:
                        cost_price = item.get('cost_price', Decimal('0.00'))
                        quantity = item['quantity']
                        item_cogs = cost_price * quantity
                        total_cogs += item_cogs
                
                if total_cogs > 0:
                    # Debit COGS
                    JournalEntryLine.objects.create(
                        journal_entry=journal_entry,
                        account=cogs_account,
                        description=f"Cost of goods sold",
                        debit_amount=total_cogs,
                        credit_amount=Decimal('0.00')
                    )
                    
                    # Credit Inventory
                    JournalEntryLine.objects.create(
                        journal_entry=journal_entry,
                        account=inventory_account,
                        description=f"Inventory reduction",
                        debit_amount=Decimal('0.00'),
                        credit_amount=total_cogs
                    )
                
                # Post the journal entry
                journal_entry.post(pos_transaction.created_by)
                
                logger.info(f"Created journal entry {journal_entry.id} for POS transaction {pos_transaction.transaction_number}")
                return journal_entry
                
        except Exception as e:
            logger.error(f"Error creating journal entry for POS transaction {pos_transaction.transaction_number}: {str(e)}")
            raise ValidationError(f"Failed to create accounting entries: {str(e)}")
    
    @staticmethod
    def create_refund_journal_entry(pos_refund, items_data):
        """
        Create journal entries for a POS refund.
        
        Journal Entry Structure (opposite of sale):
        - Credit: Cash/Accounts Receivable
        - Debit: Sales Revenue (refund amount)
        - Debit: Sales Tax Payable (if tax refunded)
        - Credit: Cost of Goods Sold (for returned products)
        - Debit: Inventory (for returned products)
        
        Args:
            pos_refund: POSRefund instance
            items_data: List of refunded items with cost data
            
        Returns:
            JournalEntry instance
        """
        try:
            with transaction.atomic():
                original_transaction = pos_refund.original_transaction
                
                # Create the refund journal entry
                journal_entry = JournalEntry.objects.create(
                    date=pos_refund.created_at.date(),
                    description=f"POS Refund - {pos_refund.refund_number} (Original: {original_transaction.transaction_number})",
                    reference=pos_refund.refund_number,
                    business=getattr(pos_refund, 'business', None),
                    created_by=pos_refund.created_by
                )
                
                # Get required accounts
                if original_transaction.payment_method == 'cash':
                    credit_account = AccountingService.get_or_create_account('cash')
                else:
                    credit_account = AccountingService.get_or_create_account('accounts_receivable')
                
                sales_revenue_account = AccountingService.get_or_create_account('sales_revenue')
                sales_tax_account = AccountingService.get_or_create_account('sales_tax_payable')
                cogs_account = AccountingService.get_or_create_account('cost_of_goods_sold')
                inventory_account = AccountingService.get_or_create_account('inventory')
                
                # 1. Credit Cash/AR for refund amount
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=credit_account,
                    description=f"Refund payment - {original_transaction.payment_method}",
                    debit_amount=Decimal('0.00'),
                    credit_amount=pos_refund.total_amount
                )
                
                # 2. Debit Sales Revenue for refund amount (excluding tax)
                revenue_refund = pos_refund.total_amount - pos_refund.tax_amount
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=sales_revenue_account,
                    description=f"Sales revenue refund",
                    debit_amount=revenue_refund,
                    credit_amount=Decimal('0.00')
                )
                
                # 3. Debit Sales Tax Payable (if any tax refunded)
                if pos_refund.tax_amount > 0:
                    JournalEntryLine.objects.create(
                        journal_entry=journal_entry,
                        account=sales_tax_account,
                        description=f"Sales tax refund",
                        debit_amount=pos_refund.tax_amount,
                        credit_amount=Decimal('0.00')
                    )
                
                # 4. Cost of Goods Sold reversal entries (for returned products)
                total_cogs_reversal = Decimal('0.00')
                for item in items_data:
                    if item['type'] == 'product' and 'cost_price' in item:
                        cost_price = item.get('cost_price', Decimal('0.00'))
                        quantity_returned = item['quantity_returned']
                        item_cogs_reversal = cost_price * quantity_returned
                        total_cogs_reversal += item_cogs_reversal
                
                if total_cogs_reversal > 0:
                    # Credit COGS (reversal)
                    JournalEntryLine.objects.create(
                        journal_entry=journal_entry,
                        account=cogs_account,
                        description=f"Cost of goods sold reversal",
                        debit_amount=Decimal('0.00'),
                        credit_amount=total_cogs_reversal
                    )
                    
                    # Debit Inventory (restocking)
                    JournalEntryLine.objects.create(
                        journal_entry=journal_entry,
                        account=inventory_account,
                        description=f"Inventory restoration",
                        debit_amount=total_cogs_reversal,
                        credit_amount=Decimal('0.00')
                    )
                
                # Post the journal entry
                journal_entry.post(pos_refund.created_by)
                
                logger.info(f"Created refund journal entry {journal_entry.id} for POS refund {pos_refund.refund_number}")
                return journal_entry
                
        except Exception as e:
            logger.error(f"Error creating refund journal entry for {pos_refund.refund_number}: {str(e)}")
            raise ValidationError(f"Failed to create refund accounting entries: {str(e)}")
    
    @staticmethod
    def void_transaction_journal_entry(pos_transaction):
        """
        Create journal entries to void a POS transaction.
        
        Args:
            pos_transaction: POSTransaction instance to void
            
        Returns:
            JournalEntry instance
        """
        try:
            with transaction.atomic():
                # Create the void journal entry
                journal_entry = JournalEntry.objects.create(
                    date=timezone.now().date(),
                    description=f"VOID POS Sale - {pos_transaction.transaction_number}",
                    reference=f"VOID-{pos_transaction.transaction_number}",
                    business=getattr(pos_transaction, 'business', None),
                    created_by=pos_transaction.voided_by
                )
                
                # Get original journal entry to reverse
                original_journal = pos_transaction.journal_entry
                if original_journal:
                    # Create opposite entries for each line
                    for line in original_journal.lines.all():
                        JournalEntryLine.objects.create(
                            journal_entry=journal_entry,
                            account=line.account,
                            description=f"VOID: {line.description}",
                            debit_amount=line.credit_amount,  # Swap debit and credit
                            credit_amount=line.debit_amount
                        )
                
                # Post the void journal entry
                journal_entry.post(pos_transaction.voided_by)
                
                logger.info(f"Created void journal entry {journal_entry.id} for POS transaction {pos_transaction.transaction_number}")
                return journal_entry
                
        except Exception as e:
            logger.error(f"Error creating void journal entry for {pos_transaction.transaction_number}: {str(e)}")
            raise ValidationError(f"Failed to create void accounting entries: {str(e)}")
    
    @staticmethod
    def validate_accounts_exist():
        """
        Validate that all required accounts exist for POS operations.
        
        Returns:
            Dict with validation results
        """
        validation_results = {
            'valid': True,
            'missing_accounts': [],
            'created_accounts': []
        }
        
        required_accounts = ['cash', 'accounts_receivable', 'sales_revenue', 'sales_tax_payable', 
                           'cost_of_goods_sold', 'inventory']
        
        for account_type in required_accounts:
            try:
                account = AccountingService.get_or_create_account(account_type)
                if account:
                    validation_results['created_accounts'].append({
                        'type': account_type,
                        'name': account.name,
                        'account_number': account.account_number
                    })
            except Exception as e:
                validation_results['valid'] = False
                validation_results['missing_accounts'].append({
                    'type': account_type,
                    'error': str(e)
                })
        
        return validation_results