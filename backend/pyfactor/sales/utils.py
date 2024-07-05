
from finance.models import Account, AccountType, Transaction as FinanceTransaction

from django.db import connections, transaction as db_transaction, transaction
from finance.account_types import ACCOUNT_TYPES
from pyfactor.logging_config import get_logger


logger = get_logger()



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
    