#!/usr/bin/env python
"""
Fix for transaction handling issues in the SaveStep1View.post method.

This script addresses the issue where transactions are aborted but the code
continues trying to execute commands within that transaction, leading to
"current transaction is aborted, commands ignored until end of transaction block" errors.
"""

import os
import sys
import django
import logging
import traceback

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pyfactor.settings")
django.setup()

from django.db import connection, transaction
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import psycopg2

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def fix_transaction_handling():
    """
    Apply fixes to the transaction handling in the SaveStep1View.post method.
    
    This function modifies the code to:
    1. Properly handle transaction aborts
    2. Add explicit transaction state checking and rollback when needed
    3. Ensure constraints are properly deferred before executing INSERT operations
    4. Add better error recovery for transaction aborts
    """
    try:
        # Path to the views.py file
        views_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                                 'onboarding', 'views', 'views.py')
        
        # Read the current file content
        with open(views_path, 'r') as file:
            content = file.read()
        
        # Find the problematic section (around lines 2005-2042)
        start_marker = "for attempt in range(max_retries):"
        end_marker = "raise"
        
        # Find the start and end positions
        start_pos = content.find(start_marker)
        if start_pos == -1:
            logger.error("Could not find the start marker in the file.")
            return False
        
        # Find the section that needs to be replaced
        section_start = content.rfind("for attempt in range(max_retries):", 0, start_pos + 2000)
        if section_start == -1:
            logger.error("Could not find the retry loop in the file.")
            return False
        
        # Find the end of the section (the raise statement after the retry loop)
        section_end = content.find("                                        raise", section_start)
        if section_end == -1:
            logger.error("Could not find the end of the retry loop in the file.")
            return False
        
        # Move to the end of the line
        section_end = content.find("\n", section_end) + 1
        
        # Extract the section to replace
        section_to_replace = content[section_start:section_end]
        
        # Create the improved version with better transaction handling
        improved_section = """                                for attempt in range(max_retries):
                                    try:
                                        # Check connection state first
                                        if tenant_conn.status in (psycopg2.extensions.STATUS_IN_TRANSACTION,
                                                                 psycopg2.extensions.STATUS_BEGIN):
                                            # If we're in a transaction, roll it back to get a clean state
                                            tenant_conn.rollback()
                                            logger.debug("Rolled back existing transaction before insert attempt")
                                        
                                        # Set isolation level to READ COMMITTED to avoid deadlocks
                                        tenant_conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED)
                                        
                                        # Explicitly defer constraints again after rollback
                                        with tenant_conn.cursor() as constraint_cursor:
                                            constraint_cursor.execute("SET CONSTRAINTS ALL DEFERRED")
                                        
                                        logger.debug(f"Attempting to insert business data (attempt {attempt+1}/{max_retries})")
                                        tenant_cursor.execute(\"\"\"
                                            INSERT INTO users_business (
                                                id, business_num, name, business_type,
                                                created_at, updated_at, owner_id, legal_structure
                                            ) VALUES (
                                                %s, %s, %s, %s,
                                                %s, %s, %s, %s
                                            ) RETURNING id;
                                        \"\"\", [
                                            str(business_id),
                                            business_num,
                                            serializer.validated_data['business_name'],
                                            serializer.validated_data['business_type'],
                                            now,
                                            now,
                                            str(request.user.id),
                                            serializer.validated_data.get('legal_structure', 'SOLE_PROPRIETORSHIP')
                                        ])
                                        logger.debug(f"Successfully inserted business data on attempt {attempt+1}")
                                        break
                                    except psycopg2.Error as e:
                                        # Check for transaction abort error
                                        is_aborted = "current transaction is aborted" in str(e)
                                        
                                        if attempt < max_retries - 1:
                                            logger.warning(f"Database error on attempt {attempt+1}: {str(e)}")
                                            
                                            # Always try to rollback on error
                                            try:
                                                tenant_conn.rollback()
                                                logger.debug("Rolled back transaction after error")
                                            except Exception as rollback_error:
                                                logger.error(f"Error rolling back: {str(rollback_error)}")
                                            
                                            # If transaction is aborted, we need to reset the connection
                                            if is_aborted:
                                                try:
                                                    # Close and reopen the connection
                                                    tenant_conn.close()
                                                    tenant_conn = psycopg2.connect(**conn_params)
                                                    tenant_conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
                                                    
                                                    # Create a new cursor
                                                    tenant_cursor = tenant_conn.cursor()
                                                    
                                                    # Set search path and defer constraints again
                                                    tenant_cursor.execute(f'SET search_path TO "{schema_name}", public')
                                                    tenant_cursor.execute("SET CONSTRAINTS ALL DEFERRED")
                                                    
                                                    logger.debug("Reset connection after transaction abort")
                                                except Exception as reset_error:
                                                    logger.error(f"Error resetting connection: {str(reset_error)}")
                                            
                                            # Wait with exponential backoff
                                            time.sleep(retry_delay * (2 ** attempt))
                                            continue
                                        else:
                                            logger.error(f"Failed to insert business data after {max_retries} attempts: {str(e)}")
                                            raise
"""
        
        # Replace the section in the content
        new_content = content.replace(section_to_replace, improved_section)
        
        # Write the updated content back to the file
        with open(views_path, 'w') as file:
            file.write(new_content)
        
        logger.info("Successfully updated the transaction handling in SaveStep1View.post method.")
        return True
    
    except Exception as e:
        logger.error(f"Error fixing transaction handling: {str(e)}")
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    logger.info("Starting transaction handling fix...")
    success = fix_transaction_handling()
    if success:
        logger.info("Transaction handling fix completed successfully.")
    else:
        logger.error("Failed to apply transaction handling fix.")