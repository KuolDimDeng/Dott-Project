#/Users/kuoldeng/projectx/backend/pyfactor/onboarding/utils.py
import re
import time
import uuid
import re
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

def generate_unique_database_name(user):
    """Generate standardized database name with db_ prefix"""
    if not user.email:
        logger.error(f"Cannot generate database name - user has no email: {user.id}")
        return None  # Return None instead of raising error for new users

    try:
        # Extract username part and normalize
        username = user.email.split('@')[0].lower()
        username = ''.join(c for c in username if c.isalnum())[:10]
        
        # Generate unique identifier
        unique_id = uuid.uuid4().hex[:8]
        
        # Combine with db_ prefix
        database_name = f"db_{username}_{unique_id}"
        
        # Validate format
        if not re.match(r'^db_[a-z0-9_]+$', database_name):
            logger.warning(f"Generated invalid database name format: {database_name}")
            return None
            
        logger.debug(f"Generated database name: {database_name} for user: {user.email}")
        return database_name

    except Exception as e:
        logger.error(f"Error generating database name for user {user.email}: {str(e)}")
        return None
    
def validate_database_creation(cursor, database_name):
    """Validate database was created successfully and is accessible
    
    Args:
        cursor: Active database cursor
        database_name: Name of database to validate
        
    Returns:
        bool: True if database exists and is accessible
        
    Raises:
        Exception: If database doesn't exist or can't be accessed
    """
    try:
        # Validate database name format first
        if not re.match(r'^db_[a-z0-9_]+$', database_name):
            raise ValueError(f"Invalid database name format: {database_name}")

        # Check database existence
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            [database_name]
        )
        exists = cursor.fetchone()
        
        if not exists:
            logger.error(f"Database creation verification failed for: {database_name}")
            raise Exception(f"Database {database_name} creation verification failed")
            
        # Additional validation could check if database is accessible
        cursor.execute(f"SELECT current_database() FROM pg_database WHERE datname = %s", [database_name])
        
        logger.info(f"Successfully validated database: {database_name}")
        return True

    except Exception as e:
        logger.error(f"Database validation failed for {database_name}: {str(e)}")
        raise