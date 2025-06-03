"""
SQL optimizations for inventory module.
Run this file directly to apply the optimizations to the database.
"""
import os
import django
import logging

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

logger = logging.getLogger(__name__)

def apply_optimizations(tenant_schema=None):
    """Apply SQL optimizations to the database."""
    try:
        with connection.cursor() as cursor:
            # Set search path to tenant schema if provided
            if tenant_schema:
                cursor.execute(f"SET search_path TO {tenant_schema}, public;")
                logger.info(f"Set search path to {tenant_schema}")
            else:
                cursor.execute("SHOW search_path")
                current_schema = cursor.fetchone()[0]
                logger.info(f"Using current search path: {current_schema}")
            
            # Add index on created_at for faster sorting
            cursor.execute("CREATE INDEX IF NOT EXISTS inventory_product_created_at_idx ON inventory_product(created_at);")
            logger.info("Created index on inventory_product(created_at)")
            
            # Add index on product_code for faster lookups
            cursor.execute("CREATE INDEX IF NOT EXISTS inventory_product_product_code_idx ON inventory_product(product_code);")
            logger.info("Created index on inventory_product(product_code)")
            
            # Add index on name for faster text searches
            cursor.execute("CREATE INDEX IF NOT EXISTS inventory_product_name_idx ON inventory_product(name);")
            logger.info("Created index on inventory_product(name)")
            
            # Analyze the table to update statistics for the query planner
            cursor.execute("ANALYZE inventory_product;")
            logger.info("Analyzed inventory_product table")
            
            return True
    except Exception as e:
        logger.error(f"Error applying SQL optimizations: {str(e)}", exc_info=True)
        return False

if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    
    # Get tenant schema from command line argument if provided
    import sys
    tenant_schema = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Apply optimizations
    success = apply_optimizations(tenant_schema)
    
    if success:
        print("SQL optimizations applied successfully.")
    else:
        print("Failed to apply SQL optimizations. Check the logs for details.")