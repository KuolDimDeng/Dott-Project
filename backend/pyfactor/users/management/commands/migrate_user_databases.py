from django.core.management.base import BaseCommand
from django.core.management import call_command
from users.models import UserProfile
from pyfactor.logging_config import setup_logging
from pyfactor.userDatabaseRouter import UserDatabaseRouter

logger = setup_logging()

class Command(BaseCommand):
    help = 'Applies migrations to all user-specific databases'

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
                except Exception as e:
                    logger.error(f"Error applying migrations to user database {database_name}: {str(e)}")
            else:
                logger.warning(f"User profile {user_profile.id} has no associated database")