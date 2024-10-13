import django
import uuid
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

def generate_database_name(user, uuid_length=8, email_prefix_length=10):
    # Generate a UUID and take only the specified number of characters
    unique_id = str(uuid.uuid4()).replace('-', '_')[:uuid_length]

    # Get a sanitized version of the user's email prefix, truncated to the specified length
    email_prefix = user.email.split('@')[0].lower()[:email_prefix_length]

    # Add a timestamp
    timestamp = timezone.now().strftime('%Y%m%d%H%M%S')

    # Create the initial database name
    database_name = f"{unique_id}_{email_prefix}_{timestamp}"

    # Ensure the name does not exceed 63 characters
    max_length = 63
    if len(database_name) > max_length:
        # Calculate how many characters to remove
        excess_length = len(database_name) - max_length
        # Shorten the email prefix further
        email_prefix = email_prefix[:email_prefix_length - excess_length]
        database_name = f"{unique_id}_{email_prefix}_{timestamp}"

    return database_name


def create_user_database(user, business):
    # Generate a unique and compliant database name
    database_name = generate_database_name(user)
    logger.info(f"Creating user database: {database_name}")

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
    logger.info(f"Adding database to active connections: {database_name}")
    connections.databases[database_name] = settings.DATABASES[database_name]
    connections.create_connection(database_name)

    # Ensure the connection is established
    logger.info(f"Ensuring database connection is established for: {database_name}...")
    with connections[database_name].cursor() as cursor:
        cursor.execute("SELECT 1")

    logger.info(f"Database configuration updated and active for: {database_name}")
    logger.info(f"Initial database setup completed for: {database_name}")
    return database_name


def setup_user_database(database_name, user, business):
    try:
        logger.debug(f"Starting setup_user_database for: {database_name}")

        # Ensure the connection is available
        if database_name not in connections:
            connections.create_connection(database_name)

        # Run migrations for the user's database
        logger.info(f"Running migrations for database: {database_name}")
        call_command('migrate', database=database_name)

        # Apply chatbot migrations specifically
        call_command('migrate', 'chatbot', database=database_name)

        with transaction.atomic(using=database_name):
            # Populate and setup initial data
            populate_account_types(database_name)
            ensure_accounts_exist(database_name)
            create_and_populate_chart_of_accounts(database_name)

            # Fetch or create necessary accounts and perform setup
            cash_account_type = AccountType.objects.using(database_name).get(name='Cash')
            cash_account, _ = Account.objects.using(database_name).get_or_create(
                name='Cash on Hand', defaults={'account_number': '1', 'account_type': cash_account_type}
            )

            FinanceTransaction.objects.using(database_name).create(
                date=timezone.now().date(),
                description='Initial Transaction',
                account=cash_account,
                type='Deposit',
                amount=0,
                notes='Initial transaction',
                receipt=None
            )

        # Update UserProfile with the new database name and generate initial financial statements
        user_profile = UserProfile.objects.get(user=user)
        user_profile.database_name = database_name
        user_profile.save()

        generate_financial_statements(database_name)

        logger.info(f"Database {database_name} setup completed successfully")
        return database_name

    except Exception as e:
        logger.error(f"Error during user database setup for {database_name}: {str(e)}")
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