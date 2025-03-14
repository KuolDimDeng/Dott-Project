#!/usr/bin/env python
"""
Script to fix a tenant schema by applying the correct migrations.

This script:
1. Takes a tenant schema name as input
2. Applies the users app migrations to the schema
3. Verifies that the users_userprofile table exists

Usage:
    python fix_tenant_schema.py <schema_name>
"""

import os
import sys
import django
import logging
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s %(asctime)s %(name)s %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings
from django.db import connection

def fix_logger_configuration():
    """Fix logger configuration to avoid 'duration' field errors."""
    logger.info("Fixing logger configuration...")
    import logging
    
    # Get all loggers
    for logger_name in logging.root.manager.loggerDict:
        logger_obj = logging.getLogger(logger_name)
        
        # Check and fix handlers
        for handler in logger_obj.handlers:
            if hasattr(handler, 'formatter') and handler.formatter:
                # Check if formatter uses 'duration' field
                if hasattr(handler.formatter, '_fmt') and '%(duration)' in str(handler.formatter._fmt):
                    # Create a new formatter without the duration field
                    new_fmt = str(handler.formatter._fmt).replace('%(duration)', '0.0')
                    handler.setFormatter(logging.Formatter(new_fmt))
                    logger.info(f"Fixed formatter for logger: {logger_name}")
    
    # Fix Django's db logger specifically
    db_logger = logging.getLogger('django.db.backends')
    if db_logger.handlers:
        for handler in db_logger.handlers:
            if hasattr(handler, 'formatter'):
                handler.setFormatter(logging.Formatter('%(levelname)s %(message)s'))
    
    logger.info("Logger configuration fixed.")

def check_schema_exists(schema_name):
    """Check if the schema exists."""
    logger.info(f"Checking if schema {schema_name} exists...")
    
    # Get database connection details
    db_settings = settings.DATABASES['default']
    
    # Connect to the database
    conn = psycopg2.connect(
        dbname=db_settings['NAME'],
        user=db_settings['USER'],
        password=db_settings['PASSWORD'],
        host=db_settings['HOST'],
        port=db_settings['PORT']
    )
    
    # Check if schema exists
    with conn.cursor() as cursor:
        cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name = %s;", (schema_name,))
        result = cursor.fetchone()
    
    conn.close()
    
    if result:
        logger.info(f"Schema {schema_name} exists")
        return True
    else:
