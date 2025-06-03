# /Users/kuoldeng/projectx/backend/pyfactor/finance/utils.py
from django.utils import timezone
from django.apps import apps
from decimal import Decimal
from django.conf import settings
from finance.models import AccountType, Account, FinanceTransaction, FinancialStatement, GeneralLedgerEntry, RevenueAccount, CashAccount, AccountCategory, ChartOfAccount
from django.db import DatabaseError, OperationalError, transaction, connections
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from pyfactor.logging_config import get_logger
from finance.account_types import ACCOUNT_TYPES
from django.db.models import Sum
from django.apps import apps
import traceback

logger = get_logger()
def ensure_dynamic_database(database_name):
    router = UserDatabaseRouter()
    router.create_dynamic_database(database_name)
    if not is_valid_database(database_name):
        raise DatabaseError(f"Invalid or inaccessible database: {database_name}")


def is_valid_database(database_name):
    if database_name in settings.DATABASES:
        try:
            connection = connections[database_name]
            connection.ensure_connection()
            return True
        except OperationalError:
            logger.error(f"Operational error connecting to database '{database_name}'")
            return False
    return False


def create_revenue_account(database_name, date, account_name, transaction_type, amount, notes, receipt, account_type_name, account_type_id):
    account_type_id = ACCOUNT_TYPES.get(account_type_name)
    if account_type_id is None:
        raise ValueError(f"Invalid account type: {account_type_name}")
    logger.info('Creating a revenue account in user database...')
    logger.debug('Database name: %s', database_name)
    logger.debug('Account name: %s', account_name)
    
    ensure_dynamic_database(database_name)

    try:
        with transaction.atomic(using=database_name):
            # Check if the account type already exists
            logger.debug('Checking if account type "%s" exists... (ID: %s)', account_type_name, account_type_id)            
            account_type, created = AccountType.objects.using(database_name).get_or_create(
                name=account_type_name,
                defaults={'account_type_id': account_type_id}  # Add this line
            )            
            if created:
                logger.info('Account type "%s" created.', account_type_name)
            else:
                logger.info('Account type "%s" already exists.', account_type_name)

            # Check if the cash account already exists
            logger.debug('Checking if cash account "%s" exists...', account_name)
            cash_account, created = Account.objects.using(database_name).get_or_create(
                name=account_name,
                account_type=account_type,
                defaults={'account_number': '1'}
            )
            if created:
                logger.info('Cash account "%s" created.', account_name)
            else:
                logger.info('Cash account "%s" already exists.', account_name)

            # Convert amount to a numeric type
            try:
                amount = float(amount)
                logger.debug('Amount converted to float: %f', amount)
            except ValueError as e:
                logger.error('Invalid amount: %s', amount)
                raise

            # Create the transaction for the revenue account (credit)
            logger.debug('Creating the transaction for revenue account (credit)...')
            credit_transaction = FinanceTransaction.objects.using(database_name).create(
                date=date,
                account=cash_account,
                type=transaction_type,
                amount=amount,
                notes=notes,
                receipt=receipt
            )
            logger.info('Transaction for revenue account (credit) created.')

            # Create the transaction for the cash account (debit)
            logger.debug('Creating the transaction for cash account (debit)...')
            debit_transaction = FinanceTransaction.objects.using(database_name).create(
                date=date,
                account=cash_account,
                type='Debit',
                amount=-amount,
                notes=notes,
                receipt=receipt
            )
            logger.info('Transaction for cash account (debit) created.')

            # Create the revenue account entry and associate it with the credit transaction
            logger.debug('Creating revenue account entry...')
            RevenueAccount.objects.using(database_name).create(
                date=date,
                credit=amount,
                debit=0,
                amount=amount,
                type=transaction_type,
                description=notes,
                note=notes,
                account_type=account_type,
                transaction=credit_transaction
            )
            logger.info('Revenue account entry created.')

            # Create the cash account entry and associate it with the debit transaction
            logger.debug('Creating cash account entry...')
            CashAccount.objects.using(database_name).create(
                date=date,
                credit=0,
                debit=amount,
                amount=amount,
                description=notes,
                note=notes,
                account=cash_account,
                transaction=debit_transaction
            )
            logger.info('Cash account entry created.')
    except Exception as e:
        logger.error("Error during revenue setup: %s", str(e))
        logger.error("Traceback:\n%s", traceback.format_exc())
        raise
    
def get_or_create_account(database_name, account_name, account_type_name):
    logger.debug(f"Fetching or creating account: {account_name} in database: {database_name}")
    AccountType = apps.get_model('finance', 'AccountType')
    ChartOfAccount = apps.get_model('finance', 'ChartOfAccount')
    AccountCategory = apps.get_model('finance', 'AccountCategory')

    account_type_id = ACCOUNT_TYPES.get(account_type_name)


    if account_type_id is None:
        raise ValueError(f"Invalid account type: {account_type_name}")

    try:
        with transaction.atomic(using=database_name):
           
            account_type, _ = AccountType.objects.using(database_name).get_or_create(name=account_type_name)
            category, _ = AccountCategory.objects.using(database_name).get_or_create(
                name=account_type_name,
                defaults={'code': account_type.account_type_id}
            )
            
            chart_account, _ = ChartOfAccount.objects.using(database_name).get_or_create(
                name=account_name,
                defaults={
                    'account_number': f"{category.code}{account_type.account_type_id}",
                    'description': f"{account_name} account",
                    'category': category,
                    'balance': 0,
                    'is_active': True
                }
            )

            return chart_account
    except Exception as e:
        logger.exception(f"Error fetching or creating account: {e}")
        raise
    
    
def update_chart_of_accounts(database_name, account_number, amount, transaction_type):
    if account_number is None:
        logger.error("Account number is None, cannot update Chart of Accounts")
        return  # or raise an exception if you prefer

    with transaction.atomic(using=database_name):
        try:
            account = ChartOfAccount.objects.using(database_name).get(account_number=account_number)
            if transaction_type == 'debit':
                account.balance += amount
            elif transaction_type == 'credit':
                account.balance -= amount
            else:
                logger.error(f"Invalid transaction type: {transaction_type}")
                return  # or raise an exception
            account.save(using=database_name)
            logger.info(f"Updated account {account_number} in Chart of Accounts. New balance: {account.balance}")
        except ChartOfAccount.DoesNotExist:
            logger.error(f"Account {account_number} not found in Chart of Accounts")
            # Optionally, you could create the account here if it doesn't exist
            # ChartOfAccount.objects.using(database_name).create(account_number=account_number, balance=amount if transaction_type == 'debit' else -amount)
            
            
            
def create_general_ledger_entry(database_name, chart_account, amount, entry_type, description):
    GeneralLedgerEntry = apps.get_model('finance', 'GeneralLedgerEntry')
    ChartOfAccount = apps.get_model('finance', 'ChartOfAccount')

    if entry_type not in ['debit', 'credit']:
        raise ValueError("entry_type must be either 'debit' or 'credit'")

    if not isinstance(chart_account, ChartOfAccount):
        raise ValueError("chart_account must be a ChartOfAccount instance")

    debit_amount = amount if entry_type == 'debit' else Decimal('0')
    credit_amount = amount if entry_type == 'credit' else Decimal('0')

    try:
        with transaction.atomic(using=database_name):
            current_balance = GeneralLedgerEntry.objects.using(database_name).filter(account=chart_account).order_by('-id').first()

            if current_balance:
                new_balance = current_balance.balance + debit_amount - credit_amount
            else:
                new_balance = debit_amount - credit_amount

            entry = GeneralLedgerEntry.objects.using(database_name).create(
                account=chart_account,
                date=timezone.now(),
                description=description,
                debit_amount=debit_amount,
                credit_amount=credit_amount,
                balance=new_balance
            )

            # Update the ChartOfAccount balance
            chart_account.balance = new_balance
            chart_account.save(using=database_name)

            logger.info(f"Created GeneralLedgerEntry and updated ChartOfAccount balance for account {chart_account.name}. New balance: {new_balance}")

            return entry
    except Exception as e:
        logger.error(f"Error creating GeneralLedgerEntry: {str(e)}")
        raise


def get_or_create_chart_account(database_name, account_name, account_type_name):
    logger.debug(f"Fetching or creating chart account: {account_name} in database: {database_name}")
    AccountType = apps.get_model('finance', 'AccountType')
    ChartOfAccount = apps.get_model('finance', 'ChartOfAccount')
    AccountCategory = apps.get_model('finance', 'AccountCategory')

    account_type_id = ACCOUNT_TYPES.get(account_type_name)

    if account_type_id is None:
        raise ValueError(f"Invalid account type: {account_type_name}")

    try:
        with transaction.atomic(using=database_name):
            # Try to get the AccountType, if multiple exist, use the first one
            account_type = AccountType.objects.using(database_name).filter(name=account_type_name).first()
            if not account_type:
                account_type = AccountType.objects.using(database_name).create(
                    name=account_type_name,
                    account_type_id=account_type_id
                )

            # Log existing AccountCategory entries for this account type
            existing_categories = AccountCategory.objects.using(database_name).filter(name=account_type_name)
            logger.debug(f"Existing AccountCategory entries for {account_type_name}: {[c.id for c in existing_categories]}")

            if existing_categories.exists():
                category = existing_categories.first()
                logger.debug(f"Using existing AccountCategory: {category.id} - {category.name}")
            else:
                category = AccountCategory.objects.using(database_name).create(
                    name=account_type_name,
                    code=str(account_type_id)
                )
                logger.debug(f"Created new AccountCategory: {category.id} - {category.name}")

            chart_account, created = ChartOfAccount.objects.using(database_name).get_or_create(
                name=account_name,
                defaults={
                    'account_number': f"{category.code}{account_type.account_type_id:02d}",
                    'description': f"{account_name} account",
                    'category': category,
                    'balance': 0,
                    'is_active': True
                }
            )

            if created:
                logger.info(f"Created new ChartOfAccount: {chart_account}")
            else:
                logger.info(f"Retrieved existing ChartOfAccount: {chart_account}")

            return chart_account
    except Exception as e:
        logger.exception(f"Error fetching or creating chart account: {e}")
        raise
    
 
def generate_financial_statements(database_name):
    today = timezone.now().date()
    logger.info(f"Generating financial statements for database: {database_name}, date: {today}")

    # Fetch all accounts
    accounts = ChartOfAccount.objects.using(database_name).all()

    # Group accounts by category
    revenue_accounts = accounts.filter(category__name='Revenue')
    cogs_accounts = accounts.filter(category__name='Cost of Goods Sold')
    expense_accounts = accounts.filter(category__name='Expense')
    asset_accounts = accounts.filter(category__name__in=['Current Asset', 'Fixed Asset'])
    liability_accounts = accounts.filter(category__name__in=['Current Liability', 'Long Term Liability'])
    equity_accounts = accounts.filter(category__name='Equity')

    # Profit and Loss Statement
    revenue = sum(-account.balance for account in revenue_accounts)  # Negative because revenue is typically stored as negative
    cost_of_goods_sold = sum(account.balance for account in cogs_accounts)
    gross_profit = revenue - cost_of_goods_sold
    operating_expenses = sum(account.balance for account in expense_accounts)
    net_income = gross_profit - operating_expenses

    pl_data = {
        'Revenue': {
            'total': float(revenue),
            'accounts': [{'name': account.name, 'amount': float(-account.balance)} for account in revenue_accounts]
        },
        'Cost of Goods Sold': {
            'total': float(cost_of_goods_sold),
            'accounts': [{'name': account.name, 'amount': float(account.balance)} for account in cogs_accounts]
        },
        'Gross Profit': float(gross_profit),
        'Operating Expenses': {
            'total': float(operating_expenses),
            'accounts': [{'name': account.name, 'amount': float(account.balance)} for account in expense_accounts]
        },
        'Net Income': float(net_income)
    }

    # Balance Sheet
    total_assets = sum(account.balance for account in asset_accounts)
    total_liabilities = sum(account.balance for account in liability_accounts)
    total_equity = sum(account.balance for account in equity_accounts) + net_income  # Include net income in equity

    bs_data = {
        'Assets': {
            'total': float(total_assets),
            'accounts': [{'name': account.name, 'amount': float(account.balance)} for account in asset_accounts]
        },
        'Liabilities': {
            'total': float(total_liabilities),
            'accounts': [{'name': account.name, 'amount': float(account.balance)} for account in liability_accounts]
        },
        'Equity': {
            'total': float(total_equity),
            'accounts': [{'name': account.name, 'amount': float(account.balance)} for account in equity_accounts] + 
                        [{'name': 'Retained Earnings', 'amount': float(net_income)}]
        }
    }

    # Cash Flow Statement
    # Note: This is a simplified version. A real cash flow statement would require more detailed analysis.
    cash_account = accounts.filter(name='Cash').first()
    if cash_account:
        net_cash_flow = cash_account.balance
    else:
        net_cash_flow = Decimal('0')
        logger.warning("No Cash account found for Cash Flow Statement")

    cf_data = {
        'Operating Activities': {
            'Net Income': float(net_income),
            # Add more operating activities here
        },
        'Investing Activities': {
            # Add investing activities here
        },
        'Financing Activities': {
            # Add financing activities here
        },
        'Net Cash Flow': float(net_cash_flow)
    }

    # Create or update financial statements
    pl_statement, _ = FinancialStatement.objects.using(database_name).update_or_create(
        statement_type='PL',
        date=today,
        defaults={'data': pl_data}
    )

    bs_statement, _ = FinancialStatement.objects.using(database_name).update_or_create(
        statement_type='BS',
        date=today,
        defaults={'data': bs_data}
    )

    cf_statement, _ = FinancialStatement.objects.using(database_name).update_or_create(
        statement_type='CF',
        date=today,
        defaults={'data': cf_data}
    )

    logger.info(f'Successfully generated financial statements for {database_name}')

    return {
        'profit_and_loss': pl_statement.data,
        'balance_sheet': bs_statement.data,
        'cash_flow': cf_statement.data
    }