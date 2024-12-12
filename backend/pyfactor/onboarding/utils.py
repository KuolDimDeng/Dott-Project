#/Users/kuoldeng/projectx/backend/pyfactor/onboarding/utils.pyimport re
import time
import uuid
import psycopg2
from django.conf import settings
from django.db import connections, OperationalError
from django.apps import apps
from django.utils import timezone
from django.core.management import call_command
from django.db import transaction
from asgiref.sync import sync_to_async
from pyfactor.logging_config import get_logger
from pyfactor.db.utils import get_connection, return_connection
from django.contrib.auth import get_user_model

logger = get_logger()

def generate_unique_database_name(user, uuid_length=8, email_prefix_length=10):
    """Generate a unique database name for the user"""
    unique_id = str(uuid.uuid4()).replace('-', '_')[:uuid_length]
    email_prefix = user.email.split('@')[0].lower()[:email_prefix_length]
    timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
    db_name = f"{unique_id}_{email_prefix}_{timestamp}"[:63]
    return re.sub(r'[^a-zA-Z0-9_]', '', db_name)

def validate_database_creation(cursor, database_name):
    """Validate database was created successfully"""
    cursor.execute(
        "SELECT 1 FROM pg_database WHERE datname = %s",
        [database_name]
    )
    exists = cursor.fetchone()
    if not exists:
        raise Exception(f"Database {database_name} creation verification failed")
    return True

