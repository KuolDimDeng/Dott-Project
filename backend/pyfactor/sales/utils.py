from datetime import datetime, date, timedelta
from finance.models import Account, AccountType, Transaction as FinanceTransaction
from django.db import connections, transaction as db_transaction
from finance.account_types import ACCOUNT_TYPES
from pyfactor.logging_config import get_logger

logger = get_logger()



def ensure_date(value):
    logger.debug(f"ensure_date called with value: {value} (type: {type(value)})")
    if isinstance(value, datetime):
        logger.debug(f"Converting datetime to date: {value}")
        return value.date()
    elif isinstance(value, str):
        try:
            converted_date = datetime.fromisoformat(value).date()
            logger.debug(f"Converted string to date: {converted_date}")
            return converted_date
        except ValueError:
            logger.error(f"Failed to convert string to date: {value}")
            raise
    elif isinstance(value, date):
        logger.debug(f"Returning date as-is: {value}")
        return value
    else:
        logger.error(f"Unsupported type for date conversion: {type(value)}")
        raise TypeError(f"Unsupported type for date conversion: {type(value)}")



def get_or_create_account(database_name, account_name, account_type_name):
    account_type_id = ACCOUNT_TYPES.get(account_type_name)
    if account_type_id is None:
        raise ValueError(f"Invalid account type: {account_type_name}")
    logger.debug(f"Fetching or creating account: {account_name} in database: {database_name}")
    try:
        with db_transaction.atomic(using=database_name):
            account_type, _ = AccountType.objects.using(database_name).get_or_create(
                id=account_type_id,
                defaults={'name': account_type_name}
            )
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


def remove_time_from_datetime(dt):
    if isinstance(dt, datetime):
        return dt.date()
    return dt


def calculate_due_date(date):
    return date + timedelta(days=30)
