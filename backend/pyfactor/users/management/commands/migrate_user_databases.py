from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.apps import apps
from django.db import connection
from users.models import UserProfile
from pyfactor.logging_config import get_logger
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from finance.account_types import ACCOUNT_TYPES

logger = get_logger()

class Command(BaseCommand):
    help = 'Applies migrations to all user-specific databases and populates the finance_accounttype table'

    def handle(self, *args, **options):
        user_profiles = UserProfile.objects.using('default').all()
        router = UserDatabaseRouter()

        for user_profile in user_profiles:
            database_name = user_profile.database_name
            if database_name:
                logger.info(f"Applying migrations to user database: {database_name}")
                try:
                    router.create_dynamic_database(database_name)
                    call_command('migrate', database=database_name)
                    logger.info(f"Migrations applied successfully to user database: {database_name}")

                    # Clean up duplicates in the finance_accounttype table
                    logger.info(f"Cleaning up duplicates in finance_accounttype table for user database: {database_name}")
                    self.clean_up_duplicates(database_name)

                    # Populate the finance_accounttype table
                    logger.info(f"Populating finance_accounttype table for user database: {database_name}")
                    AccountType = apps.get_model('finance', 'AccountType')
                    for account_type_name, account_type_id in ACCOUNT_TYPES.items():
                        AccountType.objects.using(database_name).update_or_create(
                            account_type_id=account_type_id,
                            defaults={'name': account_type_name}
                        )
                    logger.info(f"finance_accounttype table populated successfully for user database: {database_name}")

                except Exception as e:
                    logger.error(f"Error applying migrations or populating finance_accounttype table for user database {database_name}: {str(e)}")
            else:
                logger.warning(f"User profile {user_profile.id} has no associated database")

    def clean_up_duplicates(self, database_name):
        with connection.cursor() as cursor:
            cursor.execute(f"""
                DELETE FROM finance_accounttype
                WHERE id NOT IN (
                    SELECT MIN(id)
                    FROM finance_accounttype
                    GROUP BY account_type_id
                );
            """)
        logger.info(f"Duplicates cleaned up in finance_accounttype table for database: {database_name}")
