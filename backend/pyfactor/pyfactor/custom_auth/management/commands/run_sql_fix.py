import os
import psycopg2
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Run SQL fixes on the database'

    def handle(self, *args, **options):
        try:
            # Use Django database settings or environment variables
            db_config = settings.DATABASES['default']
            
            conn = psycopg2.connect(
                host=db_config['HOST'],
                database=db_config['NAME'],
                user=db_config['USER'],
                password=db_config['PASSWORD'],
                port=db_config['PORT'],
            )
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully connected to database at {db_config["HOST"]}')
            )
            
            # Add your SQL fixes here
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Database connection failed: {str(e)}')
            ) 