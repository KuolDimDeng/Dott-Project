from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.apps import apps
from django.db import connection, connections, transaction as db_transaction
from users.models import UserProfile
from pyfactor.logging_config import get_logger
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from finance.account_types import ACCOUNT_TYPES
from sales.views import ensure_accounts_exist  # Import the function we created earlier

logger = get_logger()

class Command(BaseCommand):
    help = 'Applies migrations to all user-specific databases, populates the finance_accounttype table, and ensures necessary accounts exist'

    def handle(self, *args, **options):
        user_profiles = UserProfile.objects.using('default').all()
        router = UserDatabaseRouter()

        for user_profile in user_profiles:
            database_name = user_profile.database_name
            if database_name:
                logger.info(f"Processing user database: {database_name}")
                try:
                    router.create_dynamic_database(database_name)
                    call_command('migrate', database=database_name)
                    logger.info(f"Migrations applied successfully to user database: {database_name}")
                    
                    # Create user_chatbot_message table
                    self.create_user_chatbot_message_table(database_name)

                    # Clean up duplicates in the finance_accounttype table
                    self.clean_up_duplicates(database_name)

                    # Populate the finance_accounttype table
                    self.populate_finance_accounttype(database_name)

                    # Ensure necessary accounts exist, including Accounts Payable
                    self.ensure_accounts(database_name)

                except Exception as e:
                    logger.error(f"Error processing user database {database_name}: {str(e)}")
            else:
                logger.warning(f"User profile {user_profile.id} has no associated database")

    def create_user_chatbot_message_table(self, database_name):
        logger.info(f"Creating user_chatbot_message table in user database: {database_name}")
        with connections[database_name].cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_chatbot_message (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    message TEXT NOT NULL,
                    is_from_user BOOLEAN NOT NULL,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
        logger.info(f"user_chatbot_message table created successfully in user database: {database_name}")

    def clean_up_duplicates(self, database_name):
        logger.info(f"Cleaning up duplicates in finance_accounttype table for user database: {database_name}")
        with connections[database_name].cursor() as cursor:
            cursor.execute("""
                DELETE FROM finance_accounttype
                WHERE id NOT IN (
                    SELECT MIN(id)
                    FROM finance_accounttype
                    GROUP BY account_type_id
                );
            """)
        logger.info(f"Duplicates cleaned up in finance_accounttype table for database: {database_name}")

    def populate_finance_accounttype(self, database_name):
        logger.info(f"Populating finance_accounttype table for user database: {database_name}")
        AccountType = apps.get_model('finance', 'AccountType')
        for account_type_name, account_type_id in ACCOUNT_TYPES.items():
            AccountType.objects.using(database_name).update_or_create(
                account_type_id=account_type_id,
                defaults={'name': account_type_name}
            )
        logger.info(f"finance_accounttype table populated successfully for user database: {database_name}")

    def ensure_accounts(self, database_name):
        logger.info(f"Ensuring necessary accounts exist in user database: {database_name}")
        with db_transaction.atomic(using=database_name):
            ensure_accounts_exist(database_name)
        logger.info(f"Necessary accounts ensured for user database: {database_name}")