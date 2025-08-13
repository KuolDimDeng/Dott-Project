"""
Initialize Chart of Accounts with standard accounting structure
Based on Generally Accepted Accounting Principles (GAAP)
FIXED VERSION - Uses ChartOfAccount and AccountCategory models
"""

from django.db import transaction
from finance.models import ChartOfAccount, AccountCategory
import logging
import uuid

logger = logging.getLogger(__name__)

# Standard Chart of Accounts Template
STANDARD_CHART_OF_ACCOUNTS = [
    # Assets (1000-1999)
    {'category': 'Assets', 'code': 'ASSET', 'accounts': [
        {'number': '1000', 'name': 'Cash', 'description': 'Cash and cash equivalents'},
        {'number': '1010', 'name': 'Petty Cash', 'description': 'Petty cash fund'},
        {'number': '1100', 'name': 'Accounts Receivable', 'description': 'Money owed by customers'},
        {'number': '1200', 'name': 'Inventory', 'description': 'Goods available for sale'},
        {'number': '1300', 'name': 'Prepaid Expenses', 'description': 'Expenses paid in advance'},
        {'number': '1400', 'name': 'Office Supplies', 'description': 'Office supplies and materials'},
        {'number': '1500', 'name': 'Equipment', 'description': 'Office and business equipment'},
        {'number': '1510', 'name': 'Accumulated Depreciation - Equipment', 'description': 'Accumulated depreciation on equipment'},
        {'number': '1600', 'name': 'Buildings', 'description': 'Buildings and improvements'},
        {'number': '1610', 'name': 'Accumulated Depreciation - Buildings', 'description': 'Accumulated depreciation on buildings'},
        {'number': '1700', 'name': 'Land', 'description': 'Land owned by business'},
        {'number': '1800', 'name': 'Other Assets', 'description': 'Other business assets'},
    ]},
    
    # Liabilities (2000-2999)
    {'category': 'Liabilities', 'code': 'LIABILITY', 'accounts': [
        {'number': '2000', 'name': 'Accounts Payable', 'description': 'Money owed to suppliers'},
        {'number': '2100', 'name': 'Credit Card Payable', 'description': 'Credit card balances'},
        {'number': '2200', 'name': 'Sales Tax Payable', 'description': 'Sales tax collected but not remitted'},
        {'number': '2300', 'name': 'Payroll Liabilities', 'description': 'Wages and payroll taxes owed'},
        {'number': '2400', 'name': 'Income Tax Payable', 'description': 'Income taxes owed'},
        {'number': '2500', 'name': 'Short-term Loans', 'description': 'Loans due within one year'},
        {'number': '2600', 'name': 'Unearned Revenue', 'description': 'Prepaid customer deposits'},
        {'number': '2700', 'name': 'Long-term Loans', 'description': 'Loans due after one year'},
        {'number': '2800', 'name': 'Mortgage Payable', 'description': 'Mortgage loans'},
        {'number': '2900', 'name': 'Other Liabilities', 'description': 'Other business obligations'},
    ]},
    
    # Equity (3000-3999)
    {'category': 'Equity', 'code': 'EQUITY', 'accounts': [
        {'number': '3000', 'name': "Owner's Equity", 'description': "Owner's investment in the business"},
        {'number': '3100', 'name': "Owner's Investment", 'description': 'Capital contributions by owner'},
        {'number': '3200', 'name': "Owner's Draw", 'description': 'Owner withdrawals from business'},
        {'number': '3300', 'name': 'Retained Earnings', 'description': 'Accumulated profits'},
        {'number': '3900', 'name': 'Opening Balance Equity', 'description': 'Opening balance adjustments'},
    ]},
    
    # Revenue (4000-4999)
    {'category': 'Revenue', 'code': 'REVENUE', 'accounts': [
        {'number': '4000', 'name': 'Sales Revenue', 'description': 'Income from product sales'},
        {'number': '4100', 'name': 'Service Revenue', 'description': 'Income from services'},
        {'number': '4200', 'name': 'Interest Income', 'description': 'Interest earned'},
        {'number': '4300', 'name': 'Other Income', 'description': 'Miscellaneous income'},
        {'number': '4400', 'name': 'Sales Returns and Allowances', 'description': 'Returns and discounts'},
        {'number': '4500', 'name': 'Sales Discounts', 'description': 'Discounts given to customers'},
    ]},
    
    # Expenses (5000-5999)
    {'category': 'Expenses', 'code': 'EXPENSE', 'accounts': [
        {'number': '5000', 'name': 'Cost of Goods Sold', 'description': 'Direct cost of products sold'},
        {'number': '5100', 'name': 'Salaries and Wages', 'description': 'Employee compensation'},
        {'number': '5200', 'name': 'Payroll Tax Expense', 'description': 'Employer payroll taxes'},
        {'number': '5300', 'name': 'Employee Benefits', 'description': 'Employee benefits and insurance'},
        {'number': '5400', 'name': 'Rent Expense', 'description': 'Office and facility rent'},
        {'number': '5500', 'name': 'Utilities', 'description': 'Electricity, water, gas, internet'},
        {'number': '5600', 'name': 'Office Supplies Expense', 'description': 'Office supplies used'},
        {'number': '5700', 'name': 'Insurance Expense', 'description': 'Business insurance premiums'},
        {'number': '5800', 'name': 'Advertising and Marketing', 'description': 'Marketing and advertising costs'},
        {'number': '5900', 'name': 'Professional Fees', 'description': 'Legal and accounting fees'},
        {'number': '6000', 'name': 'Bank Fees', 'description': 'Bank charges and fees'},
        {'number': '6100', 'name': 'Credit Card Processing Fees', 'description': 'Payment processing fees'},
        {'number': '6200', 'name': 'Depreciation Expense', 'description': 'Asset depreciation'},
        {'number': '6300', 'name': 'Repairs and Maintenance', 'description': 'Equipment and facility maintenance'},
        {'number': '6400', 'name': 'Travel Expense', 'description': 'Business travel costs'},
        {'number': '6500', 'name': 'Meals and Entertainment', 'description': 'Business meals and entertainment'},
        {'number': '6600', 'name': 'Vehicle Expense', 'description': 'Vehicle operating costs'},
        {'number': '6700', 'name': 'Telephone Expense', 'description': 'Phone and communication costs'},
        {'number': '6800', 'name': 'Postage and Delivery', 'description': 'Shipping and postage'},
        {'number': '6900', 'name': 'Other Operating Expenses', 'description': 'Miscellaneous operating costs'},
    ]},
]


@transaction.atomic
def initialize_chart_of_accounts(tenant_id, business=None):
    """
    Initialize Chart of Accounts for a tenant
    
    Args:
        tenant_id: The tenant UUID (can be string or UUID)
        business: Optional Business instance
    
    Returns:
        dict: Summary of created accounts
    """
    try:
        # Convert tenant_id to string if it's a UUID object
        if hasattr(tenant_id, 'hex'):
            tenant_id_str = str(tenant_id)
        else:
            tenant_id_str = str(tenant_id)
        
        # Ensure it's a valid UUID format
        try:
            tenant_uuid = uuid.UUID(tenant_id_str)
            tenant_id_str = str(tenant_uuid)
        except (ValueError, AttributeError):
            logger.error(f"Invalid tenant_id format: {tenant_id}")
            return {
                'success': False,
                'error': f'Invalid tenant_id format: {tenant_id}'
            }
        
        logger.info(f"Initializing Chart of Accounts for tenant: {tenant_id_str}")
        
        # Check if accounts already exist for this tenant
        existing_accounts = ChartOfAccount.objects.filter(tenant_id=tenant_id_str).count()
        if existing_accounts > 0:
            logger.info(f"Tenant {tenant_id_str} already has {existing_accounts} accounts")
            return {
                'success': True,
                'message': f'Chart of Accounts already initialized with {existing_accounts} accounts',
                'created': 0,
                'existing': existing_accounts
            }
        
        created_accounts = 0
        created_categories = 0
        
        # Create accounts for each category
        for category_data in STANDARD_CHART_OF_ACCOUNTS:
            # Create or get the category
            category, cat_created = AccountCategory.objects.get_or_create(
                tenant_id=tenant_id_str,
                code=category_data['code'],
                defaults={
                    'name': category_data['category'],
                }
            )
            
            if cat_created:
                created_categories += 1
                logger.info(f"Created category: {category.name} ({category.code})")
            
            # Create accounts in this category
            for account_data in category_data['accounts']:
                # Check if account already exists
                existing = ChartOfAccount.objects.filter(
                    tenant_id=tenant_id_str,
                    account_number=account_data['number']
                ).first()
                
                if not existing:
                    account = ChartOfAccount.objects.create(
                        tenant_id=tenant_id_str,
                        business=business,
                        account_number=account_data['number'],
                        name=account_data['name'],
                        description=account_data['description'],
                        category=category,
                        balance=0,
                        is_active=True
                    )
                    created_accounts += 1
                    logger.debug(f"Created account: {account.account_number} - {account.name}")
        
        logger.info(f"Successfully created {created_accounts} accounts and {created_categories} categories for tenant {tenant_id_str}")
        
        return {
            'success': True,
            'message': f'Successfully initialized Chart of Accounts',
            'created': created_accounts,
            'categories_created': created_categories,
            'tenant_id': tenant_id_str
        }
        
    except Exception as e:
        logger.error(f"Error initializing Chart of Accounts: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            'success': False,
            'error': str(e),
            'created': 0
        }