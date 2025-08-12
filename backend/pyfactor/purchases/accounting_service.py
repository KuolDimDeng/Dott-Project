"""
Purchase Accounting Service
Handles IFRS and GAAP specific accounting for purchases
"""

from decimal import Decimal
from django.db import transaction as db_transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from finance.models import JournalEntry, JournalEntryLine, ChartOfAccount
from pyfactor.logging_config import get_logger
from accounting.services import AccountingStandardsService
from users.models import BusinessDetails

logger = get_logger()


class PurchaseAccountingService:
    """
    Service class for handling purchase accounting with IFRS/GAAP compliance
    """
    
    @staticmethod
    def create_purchase_journal_entry(bill, bill_items, business_id=None):
        """
        Create journal entry for a purchase/bill with IFRS/GAAP specific handling
        
        Journal Entry Structure:
        - Debit: Expense/Asset Account (based on purchase type)
        - Credit: Accounts Payable
        
        Special IFRS/GAAP considerations:
        - Development costs capitalization (IFRS allows, GAAP generally doesn't)
        - Inventory valuation method (LIFO allowed only under GAAP)
        """
        try:
            with db_transaction.atomic():
                # Get accounting standard
                accounting_standard = 'IFRS'  # Default
                if business_id:
                    accounting_standard = AccountingStandardsService.get_business_accounting_standard(business_id)
                
                # Create journal entry
                journal_entry = JournalEntry.objects.create(
                    date=bill.bill_date.date() if hasattr(bill.bill_date, 'date') else bill.bill_date,
                    description=f"Purchase Bill - {bill.bill_number}",
                    reference=bill.bill_number,
                    created_by=bill.created_by if hasattr(bill, 'created_by') else None
                )
                
                # Get accounts payable account
                ap_account = PurchaseAccountingService._get_or_create_account('Accounts Payable', 'Current Liabilities')
                
                total_amount = Decimal('0.00')
                
                # Process each bill item
                for item in bill_items:
                    # Determine if this is an expense or asset
                    if PurchaseAccountingService._is_capitalizable_item(item, accounting_standard):
                        # Capitalize as asset
                        account = PurchaseAccountingService._get_asset_account(item, accounting_standard)
                        description = f"Capitalized: {item.get('description', 'Purchase')}"
                    else:
                        # Expense immediately
                        account = PurchaseAccountingService._get_expense_account(item)
                        description = item.get('description', 'Purchase expense')
                    
                    amount = Decimal(str(item.get('amount', '0.00')))
                    total_amount += amount
                    
                    # Debit expense/asset account
                    JournalEntryLine.objects.create(
                        journal_entry=journal_entry,
                        account=account,
                        description=description,
                        debit_amount=amount,
                        credit_amount=Decimal('0.00')
                    )
                
                # Credit accounts payable
                JournalEntryLine.objects.create(
                    journal_entry=journal_entry,
                    account=ap_account,
                    description=f"Payable to {bill.vendor.vendor_name}",
                    debit_amount=Decimal('0.00'),
                    credit_amount=total_amount
                )
                
                # Post the journal entry
                journal_entry.post()
                
                logger.info(f"Created purchase journal entry {journal_entry.id} for bill {bill.bill_number}")
                return journal_entry
                
        except Exception as e:
            logger.error(f"Error creating purchase journal entry: {str(e)}")
            raise ValidationError(f"Failed to create purchase accounting entries: {str(e)}")
    
    @staticmethod
    def _is_capitalizable_item(item, accounting_standard):
        """
        Determine if an item should be capitalized based on accounting standard
        
        IFRS allows capitalization of:
        - Development costs (if criteria met)
        - Borrowing costs for qualifying assets
        
        GAAP is more restrictive:
        - Development costs generally expensed
        - Only specific costs can be capitalized
        """
        item_type = item.get('type', '').lower()
        category = item.get('category', '').lower()
        
        # Check for development costs
        if 'development' in category or 'r&d' in category:
            if accounting_standard == 'IFRS':
                # IFRS allows capitalization if criteria are met
                # Simplified logic - in reality would check specific criteria
                return item.get('meets_capitalization_criteria', False)
            else:  # GAAP
                # GAAP generally requires expensing R&D
                return False
        
        # Check for fixed assets
        if item_type in ['asset', 'equipment', 'machinery', 'building']:
            return True
        
        # Check for inventory
        if item_type == 'inventory':
            return True
        
        return False
    
    @staticmethod
    def _get_or_create_account(account_name, account_type):
        """Get or create an account"""
        try:
            account = ChartOfAccount.objects.filter(name=account_name).first()
            if not account:
                # Create account with appropriate numbering
                account_numbers = {
                    'Accounts Payable': '2100',
                    'Development Costs': '1800',
                    'Research Expense': '6100',
                    'General Expense': '6000',
                }
                
                from finance.models import AccountCategory
                category, _ = AccountCategory.objects.get_or_create(
                    name=account_type,
                    defaults={'code': account_type.upper().replace(' ', '_')}
                )
                
                account = ChartOfAccount.objects.create(
                    account_number=account_numbers.get(account_name, '9999'),
                    name=account_name,
                    description=f"{account_name} account",
                    category=category,
                    is_active=True
                )
            return account
        except Exception as e:
            logger.error(f"Error getting/creating account {account_name}: {e}")
            raise
    
    @staticmethod
    def _get_asset_account(item, accounting_standard):
        """Get the appropriate asset account based on item type and accounting standard"""
        item_type = item.get('type', '').lower()
        category = item.get('category', '').lower()
        
        if 'development' in category and accounting_standard == 'IFRS':
            return PurchaseAccountingService._get_or_create_account('Development Costs', 'Intangible Assets')
        elif item_type == 'inventory':
            return PurchaseAccountingService._get_or_create_account('Inventory', 'Current Assets')
        elif item_type in ['equipment', 'machinery']:
            return PurchaseAccountingService._get_or_create_account('Equipment', 'Fixed Assets')
        else:
            return PurchaseAccountingService._get_or_create_account('Other Assets', 'Current Assets')
    
    @staticmethod
    def _get_expense_account(item):
        """Get the appropriate expense account based on item category"""
        category = item.get('category', '').lower()
        
        if 'research' in category or 'r&d' in category:
            return PurchaseAccountingService._get_or_create_account('Research Expense', 'Operating Expenses')
        elif 'office' in category:
            return PurchaseAccountingService._get_or_create_account('Office Expense', 'Operating Expenses')
        elif 'marketing' in category:
            return PurchaseAccountingService._get_or_create_account('Marketing Expense', 'Operating Expenses')
        else:
            return PurchaseAccountingService._get_or_create_account('General Expense', 'Operating Expenses')
    
    @staticmethod
    def record_inventory_purchase(material, quantity, unit_cost, business_id, bill_reference=''):
        """
        Record inventory purchase with proper valuation method
        Uses AccountingStandardsService for FIFO/LIFO/Weighted Average
        """
        try:
            # Use the accounting service to record purchase with proper method
            return AccountingStandardsService.record_inventory_purchase(
                material, quantity, unit_cost, business_id, reference=bill_reference
            )
        except Exception as e:
            logger.error(f"Error recording inventory purchase: {e}")
            raise