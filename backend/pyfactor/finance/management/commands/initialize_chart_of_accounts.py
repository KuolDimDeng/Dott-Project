"""
Django management command to initialize the Chart of Accounts.
This creates the standard accounts needed for POS and accounting operations.

Usage:
    python manage.py initialize_chart_of_accounts
    python manage.py initialize_chart_of_accounts --force  # To recreate existing accounts
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from finance.models import ChartOfAccount, AccountCategory
from pyfactor.logging_config import get_logger

logger = get_logger()


class Command(BaseCommand):
    help = 'Initialize the Chart of Accounts with standard accounts for POS and accounting'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreation of existing accounts',
        )
        parser.add_argument(
            '--country',
            type=str,
            default='US',
            help='Country code for accounting standards (US, KE, NG, etc.)',
        )

    def handle(self, *args, **options):
        force = options['force']
        country = options['country']
        
        self.stdout.write(self.style.SUCCESS(f'\n{"="*60}'))
        self.stdout.write(self.style.SUCCESS('Chart of Accounts Initialization'))
        self.stdout.write(self.style.SUCCESS(f'{"="*60}\n'))
        
        if force:
            self.stdout.write(self.style.WARNING('Force mode enabled - existing accounts will be updated'))
        
        # Initialize categories first
        categories = self.create_account_categories()
        
        # Initialize standard accounts
        accounts_created = self.create_standard_accounts(categories, force)
        
        # Create country-specific accounts
        if country != 'US':
            self.create_country_specific_accounts(country, categories, force)
        
        self.stdout.write(self.style.SUCCESS(f'\n{"="*60}'))
        self.stdout.write(self.style.SUCCESS(f'✅ Chart of Accounts initialization complete!'))
        self.stdout.write(self.style.SUCCESS(f'   Total accounts created/updated: {accounts_created}'))
        self.stdout.write(self.style.SUCCESS(f'{"="*60}\n'))

    def create_account_categories(self):
        """Create standard account categories"""
        self.stdout.write('\nCreating account categories...')
        
        categories_data = [
            # Assets (1000-1999)
            {'code': 'CA', 'name': 'Current Assets', 'range': '1000-1499'},
            {'code': 'FA', 'name': 'Fixed Assets', 'range': '1500-1999'},
            
            # Liabilities (2000-2999)
            {'code': 'CL', 'name': 'Current Liabilities', 'range': '2000-2499'},
            {'code': 'LTL', 'name': 'Long-term Liabilities', 'range': '2500-2999'},
            
            # Equity (3000-3999)
            {'code': 'EQ', 'name': 'Equity', 'range': '3000-3999'},
            
            # Revenue (4000-4999)
            {'code': 'REV', 'name': 'Revenue', 'range': '4000-4499'},
            {'code': 'OI', 'name': 'Other Income', 'range': '4500-4999'},
            
            # Expenses (5000-5999)
            {'code': 'COGS', 'name': 'Cost of Goods Sold', 'range': '5000-5499'},
            {'code': 'OPEX', 'name': 'Operating Expenses', 'range': '5500-5999'},
            
            # Other (6000-6999)
            {'code': 'OTHER', 'name': 'Other', 'range': '6000-6999'},
        ]
        
        categories = {}
        with transaction.atomic():
            for cat_data in categories_data:
                category, created = AccountCategory.objects.get_or_create(
                    code=cat_data['code'][:10],  # Ensure max 10 chars
                    defaults={'name': cat_data['name']}
                )
                categories[cat_data['name']] = category
                if created:
                    self.stdout.write(f'  ✓ Created category: {cat_data["name"]} ({cat_data["code"]})')
                else:
                    self.stdout.write(f'  - Category exists: {cat_data["name"]} ({cat_data["code"]})')
        
        return categories

    def create_standard_accounts(self, categories, force=False):
        """Create standard chart of accounts"""
        self.stdout.write('\nCreating standard accounts...')
        
        # Standard accounts needed for POS and basic accounting
        accounts_data = [
            # ASSETS (1000-1999)
            # Current Assets
            {
                'account_number': '1000',
                'name': 'Petty Cash',
                'category': 'Current Assets',
                'description': 'Cash on hand for small expenses',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '1001',
                'name': 'Cash',
                'category': 'Current Assets',
                'description': 'Cash and cash equivalents',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '1010',
                'name': 'Cash on Hand',
                'category': 'Current Assets',
                'description': 'Physical cash in register/safe',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '1100',
                'name': 'Bank Account',
                'category': 'Current Assets',
                'description': 'Primary business bank account',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '1200',
                'name': 'Accounts Receivable',
                'category': 'Current Assets',
                'description': 'Money owed by customers',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '1300',
                'name': 'Inventory',
                'category': 'Current Assets',
                'description': 'Products held for sale',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '1310',
                'name': 'Merchandise Inventory',
                'category': 'Current Assets',
                'description': 'Retail merchandise inventory',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '1400',
                'name': 'Prepaid Expenses',
                'category': 'Current Assets',
                'description': 'Expenses paid in advance',
                'normal_balance': 'debit',
                'is_active': True
            },
            
            # Fixed Assets
            {
                'account_number': '1500',
                'name': 'Equipment',
                'category': 'Fixed Assets',
                'description': 'Business equipment and machinery',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '1550',
                'name': 'Accumulated Depreciation - Equipment',
                'category': 'Fixed Assets',
                'description': 'Accumulated depreciation on equipment',
                'normal_balance': 'credit',
                'is_active': True
            },
            
            # LIABILITIES (2000-2999)
            # Current Liabilities
            {
                'account_number': '2000',
                'name': 'Accounts Payable',
                'category': 'Current Liabilities',
                'description': 'Money owed to suppliers',
                'normal_balance': 'credit',
                'is_active': True
            },
            {
                'account_number': '2100',
                'name': 'Credit Card Payable',
                'category': 'Current Liabilities',
                'description': 'Business credit card balances',
                'normal_balance': 'credit',
                'is_active': True
            },
            {
                'account_number': '2200',
                'name': 'Sales Tax Payable',
                'category': 'Current Liabilities',
                'description': 'Sales tax collected from customers',
                'normal_balance': 'credit',
                'is_active': True
            },
            {
                'account_number': '2210',
                'name': 'Tax Payable',
                'category': 'Current Liabilities',
                'description': 'Various taxes owed',
                'normal_balance': 'credit',
                'is_active': True
            },
            {
                'account_number': '2300',
                'name': 'Customer Deposits',
                'category': 'Current Liabilities',
                'description': 'Advance payments from customers',
                'normal_balance': 'credit',
                'is_active': True
            },
            {
                'account_number': '2400',
                'name': 'Wages Payable',
                'category': 'Current Liabilities',
                'description': 'Wages owed to employees',
                'normal_balance': 'credit',
                'is_active': True
            },
            
            # EQUITY (3000-3999)
            {
                'account_number': '3000',
                'name': 'Owner\'s Equity',
                'category': 'Equity',
                'description': 'Owner\'s investment in business',
                'normal_balance': 'credit',
                'is_active': True
            },
            {
                'account_number': '3100',
                'name': 'Owner\'s Draw',
                'category': 'Equity',
                'description': 'Owner withdrawals from business',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '3200',
                'name': 'Retained Earnings',
                'category': 'Equity',
                'description': 'Accumulated profits',
                'normal_balance': 'credit',
                'is_active': True
            },
            
            # REVENUE (4000-4999)
            {
                'account_number': '4000',
                'name': 'Sales Revenue',
                'category': 'Revenue',
                'description': 'Income from sales',
                'normal_balance': 'credit',
                'is_active': True
            },
            {
                'account_number': '4010',
                'name': 'Sales',
                'category': 'Revenue',
                'description': 'Product and service sales',
                'normal_balance': 'credit',
                'is_active': True
            },
            {
                'account_number': '4100',
                'name': 'Service Revenue',
                'category': 'Revenue',
                'description': 'Income from services',
                'normal_balance': 'credit',
                'is_active': True
            },
            {
                'account_number': '4200',
                'name': 'Sales Returns and Allowances',
                'category': 'Revenue',
                'description': 'Returns and refunds',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '4300',
                'name': 'Sales Discounts',
                'category': 'Revenue',
                'description': 'Discounts given to customers',
                'normal_balance': 'debit',
                'is_active': True
            },
            
            # COST OF GOODS SOLD (5000-5499)
            {
                'account_number': '5000',
                'name': 'Cost of Goods Sold',
                'category': 'Cost of Goods Sold',
                'description': 'Direct cost of products sold',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '5010',
                'name': 'COGS',
                'category': 'Cost of Goods Sold',
                'description': 'Cost of goods sold',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '5100',
                'name': 'Purchase Returns',
                'category': 'Cost of Goods Sold',
                'description': 'Returns to suppliers',
                'normal_balance': 'credit',
                'is_active': True
            },
            
            # OPERATING EXPENSES (5500-5999)
            {
                'account_number': '5500',
                'name': 'Rent Expense',
                'category': 'Operating Expenses',
                'description': 'Monthly rent payments',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '5510',
                'name': 'Utilities Expense',
                'category': 'Operating Expenses',
                'description': 'Electricity, water, gas',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '5520',
                'name': 'Wages Expense',
                'category': 'Operating Expenses',
                'description': 'Employee wages and salaries',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '5530',
                'name': 'Advertising Expense',
                'category': 'Operating Expenses',
                'description': 'Marketing and advertising costs',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '5540',
                'name': 'Office Supplies Expense',
                'category': 'Operating Expenses',
                'description': 'Office supplies and materials',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '5550',
                'name': 'Insurance Expense',
                'category': 'Operating Expenses',
                'description': 'Business insurance premiums',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '5560',
                'name': 'Depreciation Expense',
                'category': 'Operating Expenses',
                'description': 'Asset depreciation',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '5570',
                'name': 'Bank Fees',
                'category': 'Operating Expenses',
                'description': 'Bank charges and fees',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '5580',
                'name': 'Telephone Expense',
                'category': 'Operating Expenses',
                'description': 'Phone and internet costs',
                'normal_balance': 'debit',
                'is_active': True
            },
            {
                'account_number': '5590',
                'name': 'Miscellaneous Expense',
                'category': 'Operating Expenses',
                'description': 'Other business expenses',
                'normal_balance': 'debit',
                'is_active': True
            },
        ]
        
        accounts_created = 0
        
        with transaction.atomic():
            for account_data in accounts_data:
                category = categories.get(account_data['category'])
                if not category:
                    self.stdout.write(self.style.WARNING(f'  ⚠ Category not found for {account_data["name"]}, skipping'))
                    continue
                
                # Check if account exists
                existing_account = ChartOfAccount.objects.filter(
                    account_number=account_data['account_number']
                ).first()
                
                if existing_account and not force:
                    self.stdout.write(f'  - Account exists: {account_data["account_number"]} - {account_data["name"]}')
                else:
                    # Create or update account
                    account, created = ChartOfAccount.objects.update_or_create(
                        account_number=account_data['account_number'],
                        defaults={
                            'name': account_data['name'],
                            'description': account_data['description'],
                            'category': category,
                            'is_active': account_data['is_active'],
                            'balance': Decimal('0.00')
                        }
                    )
                    
                    if created:
                        self.stdout.write(self.style.SUCCESS(f'  ✓ Created: {account_data["account_number"]} - {account_data["name"]}'))
                    else:
                        self.stdout.write(self.style.SUCCESS(f'  ↻ Updated: {account_data["account_number"]} - {account_data["name"]}'))
                    
                    accounts_created += 1
        
        return accounts_created

    def create_country_specific_accounts(self, country, categories, force=False):
        """Create country-specific accounts"""
        self.stdout.write(f'\nCreating {country}-specific accounts...')
        
        country_accounts = {
            'KE': [  # Kenya
                {
                    'account_number': '1110',
                    'name': 'M-Pesa Account',
                    'category': 'Current Assets',
                    'description': 'M-Pesa business account balance',
                    'normal_balance': 'debit'
                },
                {
                    'account_number': '2220',
                    'name': 'VAT Payable',
                    'category': 'Current Liabilities',
                    'description': 'VAT collected on sales',
                    'normal_balance': 'credit'
                },
            ],
            'NG': [  # Nigeria
                {
                    'account_number': '2220',
                    'name': 'VAT Payable',
                    'category': 'Current Liabilities',
                    'description': 'VAT collected on sales',
                    'normal_balance': 'credit'
                },
            ],
            'ZA': [  # South Africa
                {
                    'account_number': '2220',
                    'name': 'VAT Payable',
                    'category': 'Current Liabilities',
                    'description': 'VAT collected on sales',
                    'normal_balance': 'credit'
                },
            ],
            'SS': [  # South Sudan
                {
                    'account_number': '1110',
                    'name': 'Mobile Money Account',
                    'category': 'Current Assets',
                    'description': 'Mobile money account balance',
                    'normal_balance': 'debit'
                },
            ],
        }
        
        if country not in country_accounts:
            self.stdout.write(f'  No specific accounts for {country}')
            return
        
        for account_data in country_accounts[country]:
            category = categories.get(account_data['category'])
            if not category:
                continue
            
            account, created = ChartOfAccount.objects.get_or_create(
                account_number=account_data['account_number'],
                defaults={
                    'name': account_data['name'],
                    'description': account_data['description'],
                    'category': category,
                    'is_active': True,
                    'balance': Decimal('0.00')
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'  ✓ Created: {account_data["account_number"]} - {account_data["name"]}'))
            else:
                self.stdout.write(f'  - Account exists: {account_data["account_number"]} - {account_data["name"]}')