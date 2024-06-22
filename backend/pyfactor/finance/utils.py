# /Users/kuoldeng/projectx/backend/pyfactor/finance/utils.py
from django.conf import settings
from finance.models import AccountType, Account, Transaction, RevenueAccount, CashAccount
from django.db import DatabaseError, OperationalError, transaction, connections
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from pyfactor.logging_config import get_logger
from finance.account_types import ACCOUNT_TYPES
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
            credit_transaction = Transaction.objects.using(database_name).create(
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
            debit_transaction = Transaction.objects.using(database_name).create(
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
    account_type_id = ACCOUNT_TYPES.get(account_type_name)
    if account_type_id is None:
        raise ValueError(f"Invalid account type: {account_type_name}")
    
    logger.debug(f"Fetching or creating account: {account_name} in database: {database_name}")
    
    try:
        with transaction.atomic(using=database_name):
            # Get or create the AccountType
            account_type, _ = AccountType.objects.using(database_name).get_or_create(
                account_type_id=account_type_id,
                defaults={'name': account_type_name}
            )
            
            # Get or create the Account
            account, created = Account.objects.using(database_name).get_or_create(
                name=account_name,
                defaults={'account_type': account_type}
            )
            
            if created:
                logger.debug(f"Account created: {account}")
            else:
                logger.debug(f"Account already exists: {account}")
            
            return account
    except Exception as e:
        logger.exception(f"Error fetching or creating account: {e}")
        raise