import django
from django.apps import apps
from django.utils import timezone
from django.core.management import call_command
from django.db import connection, transaction, connections
from business.models import Business
from users.models import User, UserProfile
from finance.models import AccountCategory, AccountType, Account, ChartOfAccount, FinanceTransaction, FinancialStatement
from django.conf import settings
import logging
import pytz
import traceback
import psycopg2
from psycopg2 import sql
from pyfactor.logging_config import get_logger
from django.db.models import Sum
from finance.account_types import ACCOUNT_TYPES
from finance.utils import generate_financial_statements  # adjust the import path as necessary

logger = get_logger()

def create_and_populate_chart_of_accounts(database_name):
    logger.info(f"Creating and populating Chart of Accounts for database: {database_name}")

    categories = [
        ('1000', 'Current Asset'),
        ('2000', 'Current Liability'),
        ('3000', 'Equity'),
        ('4000', 'Revenue'),
        ('5000', 'Operating Expense'),
        ('6000', 'Cost of Goods Sold'),
        ('6100', 'Non-Operating Expense'),
    ]

    accounts = [
        ('1000', 'Cash', 'Petty Cash, Bank Accounts', '1000'),
        ('1100', 'Accounts Receivable', 'Customer Invoices', '1000'),
        ('1200', 'Inventory', 'Merchandise Inventory', '1000'),
        ('2000', 'Accounts Payable', 'Supplier Invoices', '2000'),
        ('2200', 'Sales Tax Payable', 'Sales Tax Collected', '2000'),  # Added Sales Tax Payable
        ('3000', 'Owner\'s Equity', 'Owner\'s Contributions', '3000'),
        ('3100', 'Retained Earnings', 'Accumulated Profits/Losses', '3000'),
        ('4000', 'Sales Revenue', 'Income from Sales', '4000'),
        ('5000', 'Cost of Goods Sold (COGS)', 'Direct Costs of Goods Sold', '5000'),
        ('5100', 'Salaries Expense', 'Employee Compensation', '5000'),
        ('5200', 'Rent Expense', 'Office Lease', '5000'),
        ('5300', 'Utilities Expense', 'Electricity, Water, Gas', '5000'),
        ('5400', 'Office Supplies Expense', 'Cost of Office Supplies', '5000'),
        ('5500', 'Advertising and Marketing Expense', 'Promotional Costs', '5000'),
        ('5600', 'Depreciation Expense', 'Depreciation on PP&E', '5000'),
        ('5700', 'Insurance Expense', 'Insurance Premiums', '5000'),
        ('5800', 'Repairs and Maintenance Expense', 'Cost of Repairs', '5000'),
        ('5900', 'Professional Fees', 'Legal, Accounting Fees', '5000'),
        ('6100', 'Interest Expense', 'Cost of Borrowing', '6100'),
        ('6200', 'Loss on Disposal of Assets', 'Losses from Asset Disposal', '6100'),
        ('6300', 'Miscellaneous Expense', 'Other Unclassified Expenses', '6100'),
    ]

    with transaction.atomic(using=database_name):
        for code, name in categories:
            AccountCategory.objects.using(database_name).get_or_create(
                code=code,
                defaults={'name': name}
            )

        for account_number, name, description, category_code in accounts:
            category = AccountCategory.objects.using(database_name).get(code=category_code)
            ChartOfAccount.objects.using(database_name).get_or_create(
                account_number=account_number,
                defaults={
                    'name': name,
                    'description': description,
                    'category': category,
                    'balance': 0,
                    'is_active': True
                }
            )

    logger.info(f"Chart of Accounts created and populated for database: {database_name}")
    
    # Log the full Chart of Accounts
    full_coa = ChartOfAccount.objects.using(database_name).all()
    logger.info(f"Full Chart of Accounts for {database_name}:")
    for account in full_coa:
        logger.info(f"Account: {account.account_number} - {account.name} (Balance: {account.balance})")
        
    
def initial_user_registration(user_data):
    logger.info("Starting initial user registration")
    try:
        # Create user without associating a database
        user = User.objects.create_user(
            email=user_data['email'],
            password=user_data['password1'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name']
        )
        logger.info(f"User created: {user.email}")
        
        # Create a temporary UserProfile without a database
        user_profile = UserProfile.objects.create(
            user=user,
            occupation=user_data['occupation'],
            phone_number=user_data.get('phone_number', ''),
            # Add other fields as necessary
        )
        logger.info(f"Temporary UserProfile created for: {user.email}")
        
        return user
    except Exception as e:
        logger.error(f"Error in initial user registration: {str(e)}")
        raise

def create_user_database(user, business):
    timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
    business_name = business.name.lower().replace(' ', '_').replace('.', '')
    database_name = f"{business_name}_{timestamp}"
    logger.info(f"Creating user database: {database_name}")

    # Ensure the database is created and configured correctly
    try:
        logger.info("Connecting to default database...")
        conn = psycopg2.connect(
            dbname=settings.DATABASES['default']['NAME'],
            user=settings.DATABASES['default']['USER'],
            password=settings.DATABASES['default']['PASSWORD'],
            host=settings.DATABASES['default']['HOST'],
            port=settings.DATABASES['default']['PORT']
        )
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)

        with conn.cursor() as cursor:
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))
            logger.info(f"User Database created: {database_name}")

        conn.close()
        logger.info("Closed connection to default database.")

    except (Exception, psycopg2.DatabaseError) as error:
        logger.error(f"Error creating database: {error}")
        raise

    # Update settings with the new database configuration
    settings.DATABASES[database_name] = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': database_name,
        'USER': settings.DATABASES['default']['USER'],
        'PASSWORD': settings.DATABASES['default']['PASSWORD'],
        'HOST': settings.DATABASES['default']['HOST'],
        'PORT': settings.DATABASES['default']['PORT'],
        'OPTIONS': {'connect_timeout': 10},
        'ATOMIC_REQUESTS': False,
        'CONN_HEALTH_CHECKS': True,
        'CONN_MAX_AGE': 600,
        'TIME_ZONE': 'UTC',
        'AUTOCOMMIT': True,
    }

    # Add database to active connections
    connections.databases[database_name] = settings.DATABASES[database_name]
    logger.info(f"Database configuration updated and active for: {database_name}")


    logger.info(f"Initial database setup completed for: {database_name}")
    return database_name


def setup_user_database(database_name, user, business):
    try:
        logger.debug(f"Starting setup_user_database for: {database_name}")
        
        # Run migrations for the user's database
        logger.info(f"Running migrations for database: {database_name}")
        call_command('migrate', database=database_name)
        
        # Apply chatbot migrations specifically
        call_command('migrate', 'chatbot', database=database_name)

        with transaction.atomic(using=database_name):
            # Create initial data
            logger.info(f"Creating initial data for database: {database_name}")
            
            # Populate account types
            logger.info(f"Populating account types for database: {database_name}")
            populate_account_types(database_name)
            
            # Ensure necessary accounts exist
            logger.info(f"Ensuring necessary accounts exist for database: {database_name}")
            ensure_accounts_exist(database_name)
            
            # Create and populate Chart of Accounts
            logger.info(f"Creating and populating Chart of Accounts for database: {database_name}")
            create_and_populate_chart_of_accounts(database_name)

            # Fetch the Cash account type
            logger.info(f"Fetching the Cash account type for database: {database_name}")
            try:
                cash_account_type = AccountType.objects.using(database_name).get(name='Cash')
                logger.info(f"Cash account type fetched successfully for database: {database_name}")
            except AccountType.DoesNotExist:
                logger.error(f"Cash account type not found in database: {database_name}")
                raise

            # Create Cash Account if it doesn't exist
            logger.info(f"Creating or getting Cash Account for database: {database_name}")
            cash_account, created = Account.objects.using(database_name).get_or_create(
                name='Cash on Hand',
                defaults={
                    'account_number': '1',
                    'account_type': cash_account_type
                }
            )
            if created:
                logger.info(f"Cash Account created for database: {database_name}")
            else:
                logger.info(f"Cash Account already exists for database: {database_name}")

            # Create Initial Transaction
            logger.info(f"Creating initial transaction for database: {database_name}")
            FinanceTransaction.objects.using(database_name).create(
                date=timezone.now().astimezone(pytz.timezone(settings.TIME_ZONE)).date(),
                description='Initial Transaction',
                account=cash_account,
                type='Deposit',
                amount=0,
                notes='Initial transaction',
                receipt=None
            )
            logger.info(f"Initial transaction created successfully for database: {database_name}")

        logger.debug(f"Initial tables and data created successfully in user's database: {database_name}")

        # Update UserProfile with the new database name
        user_profile = UserProfile.objects.get(user=user)
        user_profile.database_name = database_name
        user_profile.save()

        # Generate financial statements after the initial setup
        try:
            logger.info(f"Generating financial statements for database: {database_name}")
            generate_financial_statements(database_name)
            logger.info(f"Financial statements generated successfully for database: {database_name}")
        except Exception as e:
            logger.error(f"Error generating financial statements for {database_name}: {str(e)}")
            logger.error(f"Traceback:\n{traceback.format_exc()}")
            raise

        logger.info(f"Database {database_name} setup completed successfully")
        return database_name

    except Exception as e:
        logger.error(f"Error during user database setup for {database_name}: {str(e)}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        raise
    


def populate_account_types(database_name):
    logger.info(f"Populating account types for database: {database_name}")
    AccountType = apps.get_model('finance', 'AccountType')
    for account_type_name, account_type_id in ACCOUNT_TYPES.items():
        AccountType.objects.using(database_name).get_or_create(
            account_type_id=account_type_id,
            defaults={'name': account_type_name}
        )
    logger.info(f"Account types populated successfully for database: {database_name}")

def ensure_accounts_exist(database_name):
    logger.info(f"Ensuring necessary accounts exist in database: {database_name}")
    Account = apps.get_model('finance', 'Account')
    AccountType = apps.get_model('finance', 'AccountType')
    ChartOfAccount = apps.get_model('finance', 'ChartOfAccount')
    AccountCategory = apps.get_model('finance', 'AccountCategory')
    
    required_accounts = [
        ('1000', 'Cash', 'Current Asset', '1000'),
        ('1100', 'Accounts Receivable', 'Current Asset', '1000'),
        ('1200', 'Inventory', 'Current Asset', '1000'),
        ('2000', 'Accounts Payable', 'Current Liability', '2000'),
        ('2200', 'Sales Tax Payable', 'Current Liability', '2000'),
        ('3000', 'Owner\'s Equity', 'Equity', '3000'),
        ('4000', 'Sales Revenue', 'Revenue', '4000'),
        ('5000', 'Cost of Goods Sold (COGS)', 'Cost of Goods Sold', '5000'),
        ('5100', 'Salaries Expense', 'Operating Expense', '5000'),
        ('5200', 'Rent Expense', 'Operating Expense', '5000'),
        ('5300', 'Utilities Expense', 'Operating Expense', '5000'),
    ]

    for account_number, account_name, account_type_name, category_code in required_accounts:
        with transaction.atomic(using=database_name):
            # Get or create AccountType
            account_type, _ = AccountType.objects.using(database_name).get_or_create(
                name=account_type_name,
                defaults={'account_type_id': ACCOUNT_TYPES.get(account_type_name)}
            )

            # Get or create AccountCategory
            category, _ = AccountCategory.objects.using(database_name).get_or_create(
                code=category_code,
                defaults={'name': account_type_name}
            )

            # Get or create ChartOfAccount
            chart_account, chart_created = ChartOfAccount.objects.using(database_name).get_or_create(
                account_number=account_number,
                defaults={
                    'name': account_name,
                    'description': f'{account_name} account',
                    'category': category,
                    'balance': 0,
                    'is_active': True
                }
            )

            # Get or create Account
            account, account_created = Account.objects.using(database_name).get_or_create(
                name=account_name,
                defaults={
                    'account_type': account_type,
                    'account_number': account_number
                }
            )

            if chart_created:
                logger.info(f"Created ChartOfAccount: {account_name} ({account_number})")
            if account_created:
                logger.info(f"Created Account: {account_name} ({account_number})")

    logger.info(f"Necessary accounts ensured for database: {database_name}")