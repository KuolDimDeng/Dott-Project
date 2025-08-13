"""
Initialize Chart of Accounts with standard accounting structure
Based on Generally Accepted Accounting Principles (GAAP)
"""

from django.db import transaction
from finance.models import Account, AccountType
import logging

logger = logging.getLogger(__name__)

# Standard Chart of Accounts Template
STANDARD_CHART_OF_ACCOUNTS = {
    # Assets (1000-1999)
    'Current Asset': [
        {'number': '1000', 'name': 'Cash', 'description': 'Cash and cash equivalents'},
        {'number': '1010', 'name': 'Petty Cash', 'description': 'Petty cash fund'},
        {'number': '1100', 'name': 'Accounts Receivable', 'description': 'Money owed by customers'},
        {'number': '1200', 'name': 'Inventory', 'description': 'Goods available for sale'},
        {'number': '1300', 'name': 'Prepaid Expenses', 'description': 'Expenses paid in advance'},
        {'number': '1400', 'name': 'Other Current Assets', 'description': 'Other short-term assets'},
    ],
    
    # Liabilities (2000-2999)
    'Current Liability': [
        {'number': '2000', 'name': 'Accounts Payable', 'description': 'Money owed to suppliers'},
        {'number': '2100', 'name': 'Credit Card', 'description': 'Credit card balances'},
        {'number': '2200', 'name': 'Sales Tax Payable', 'description': 'Sales tax collected but not remitted'},
        {'number': '2300', 'name': 'Payroll Liabilities', 'description': 'Wages and payroll taxes owed'},
        {'number': '2400', 'name': 'Income Tax Payable', 'description': 'Income taxes owed'},
        {'number': '2500', 'name': 'Short-term Loans', 'description': 'Loans due within one year'},
        {'number': '2600', 'name': 'Other Current Liabilities', 'description': 'Other short-term obligations'},
    ],
    
    # Equity (3000-3999)
    'Equity': [
        {'number': '3000', 'name': 'Owner Equity', 'description': 'Owner\'s investment in the business'},
        {'number': '3100', 'name': 'Owner Investment', 'description': 'Capital contributions by owner'},
        {'number': '3200', 'name': 'Owner Drawings', 'description': 'Owner withdrawals from business'},
        {'number': '3300', 'name': 'Retained Earnings', 'description': 'Accumulated profits'},
        {'number': '3900', 'name': 'Opening Balance Equity', 'description': 'Opening balance adjustments'},
    ],
    
    # Revenue (4000-4999)
    'Revenue': [
        {'number': '4000', 'name': 'Sales Revenue', 'description': 'Income from sales'},
        {'number': '4100', 'name': 'Service Revenue', 'description': 'Income from services'},
        {'number': '4200', 'name': 'Interest Income', 'description': 'Interest earned'},
        {'number': '4300', 'name': 'Other Income', 'description': 'Miscellaneous income'},
        {'number': '4400', 'name': 'Sales Returns and Allowances', 'description': 'Returns and discounts'},
        {'number': '4500', 'name': 'Sales Discounts', 'description': 'Early payment discounts given'},
    ],
    
    # Cost of Goods Sold (5000-5999)
    'Cost of Goods Sold': [
        {'number': '5000', 'name': 'Cost of Goods Sold', 'description': 'Direct costs of products sold'},
        {'number': '5100', 'name': 'Purchase Discounts', 'description': 'Discounts received from suppliers'},
        {'number': '5200', 'name': 'Purchase Returns', 'description': 'Returns to suppliers'},
        {'number': '5300', 'name': 'Freight-In', 'description': 'Shipping costs for inventory'},
    ],
    
    # Operating Expenses (6000-7999)
    'Operating Expense': [
        {'number': '6000', 'name': 'Advertising & Marketing', 'description': 'Marketing and advertising costs'},
        {'number': '6100', 'name': 'Bank Charges', 'description': 'Bank fees and charges'},
        {'number': '6200', 'name': 'Insurance', 'description': 'Business insurance premiums'},
        {'number': '6300', 'name': 'Office Supplies', 'description': 'Office supplies and materials'},
        {'number': '6400', 'name': 'Payroll Expenses', 'description': 'Wages and salaries'},
        {'number': '6410', 'name': 'Payroll Tax Expense', 'description': 'Employer payroll taxes'},
        {'number': '6420', 'name': 'Employee Benefits', 'description': 'Employee benefit costs'},
        {'number': '6500', 'name': 'Professional Fees', 'description': 'Legal and accounting fees'},
        {'number': '6600', 'name': 'Rent Expense', 'description': 'Office or store rent'},
        {'number': '6700', 'name': 'Repairs & Maintenance', 'description': 'Repair and maintenance costs'},
        {'number': '6800', 'name': 'Telephone & Internet', 'description': 'Communication expenses'},
        {'number': '6900', 'name': 'Travel & Entertainment', 'description': 'Business travel costs'},
        {'number': '7000', 'name': 'Utilities', 'description': 'Electricity, water, gas'},
        {'number': '7100', 'name': 'Vehicle Expenses', 'description': 'Vehicle operating costs'},
        {'number': '7200', 'name': 'Depreciation Expense', 'description': 'Asset depreciation'},
        {'number': '7900', 'name': 'Other Operating Expenses', 'description': 'Miscellaneous expenses'},
    ],
    
    # Non-Operating Expenses (8000-8999)
    'Non-Operating Expense': [
        {'number': '8000', 'name': 'Interest Expense', 'description': 'Loan interest payments'},
        {'number': '8100', 'name': 'Income Tax Expense', 'description': 'Corporate income taxes'},
        {'number': '8900', 'name': 'Other Non-Operating Expenses', 'description': 'Other non-operating costs'},
    ],
}


def ensure_account_types():
    """Ensure all account types exist in the database"""
    account_types = {}
    type_id = 1
    
    for type_name in STANDARD_CHART_OF_ACCOUNTS.keys():
        account_type, created = AccountType.objects.get_or_create(
            name=type_name,
            defaults={'account_type_id': type_id}
        )
        account_types[type_name] = account_type
        if created:
            logger.info(f"Created account type: {type_name}")
        type_id += 1
    
    return account_types


@transaction.atomic
def initialize_chart_of_accounts(tenant_id, business=None):
    """
    Initialize Chart of Accounts for a tenant
    
    Args:
        tenant_id: The tenant UUID
        business: Optional Business instance
    
    Returns:
        dict: Summary of created accounts
    """
    try:
        # Ensure account types exist
        account_types = ensure_account_types()
        
        # Check if accounts already exist for this tenant
        existing_accounts = Account.objects.filter(tenant_id=tenant_id).count()
        if existing_accounts > 0:
            logger.info(f"Tenant {tenant_id} already has {existing_accounts} accounts")
            return {
                'success': True,
                'message': f'Chart of Accounts already initialized with {existing_accounts} accounts',
                'created': 0,
                'existing': existing_accounts
            }
        
        created_accounts = []
        
        # Create accounts for each type
        for type_name, accounts in STANDARD_CHART_OF_ACCOUNTS.items():
            account_type = account_types[type_name]
            
            for account_data in accounts:
                # Check if account already exists
                existing = Account.objects.filter(
                    tenant_id=tenant_id,
                    account_number=account_data['number']
                ).first()
                
                if not existing:
                    account = Account.objects.create(
                        tenant_id=tenant_id,
                        business=business,
                        account_number=account_data['number'],
                        name=account_data['name'],
                        description=account_data['description'],
                        account_type=account_type,
                        balance=0,
                        status='active'
                    )
                    created_accounts.append(account)
                    logger.info(f"Created account: {account.account_number} - {account.name}")
        
        logger.info(f"Successfully initialized {len(created_accounts)} accounts for tenant {tenant_id}")
        
        return {
            'success': True,
            'message': f'Successfully initialized Chart of Accounts',
            'created': len(created_accounts),
            'existing': 0,
            'accounts': [
                {
                    'number': acc.account_number,
                    'name': acc.name,
                    'type': acc.account_type.name
                } for acc in created_accounts[:5]  # Return first 5 as sample
            ]
        }
        
    except Exception as e:
        logger.error(f"Error initializing Chart of Accounts for tenant {tenant_id}: {str(e)}")
        raise


def initialize_for_existing_tenant(user_email):
    """
    Initialize Chart of Accounts for an existing user by email
    
    Args:
        user_email: Email of the user
    
    Returns:
        dict: Result of initialization
    """
    from django.contrib.auth import get_user_model
    from users.models import Business
    
    User = get_user_model()
    
    try:
        user = User.objects.get(email=user_email)
        tenant_id = user.tenant_id or user.business_id
        
        if not tenant_id:
            return {
                'success': False,
                'message': f'User {user_email} has no tenant_id or business_id'
            }
        
        # Get user's business if exists
        business = None
        try:
            business = Business.objects.filter(tenant_id=tenant_id).first()
        except:
            pass
        
        result = initialize_chart_of_accounts(tenant_id, business)
        result['user'] = user_email
        result['tenant_id'] = str(tenant_id)
        
        return result
        
    except User.DoesNotExist:
        return {
            'success': False,
            'message': f'User {user_email} not found'
        }
    except Exception as e:
        logger.error(f"Error initializing for user {user_email}: {str(e)}")
        return {
            'success': False,
            'message': str(e)
        }