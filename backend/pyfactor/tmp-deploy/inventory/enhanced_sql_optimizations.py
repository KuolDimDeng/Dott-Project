"""
Enhanced SQL optimizations for inventory module.
This script includes additional indexes and optimizations for better performance.
"""
import os
import django
import logging

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

logger = logging.getLogger(__name__)

def apply_enhanced_optimizations(tenant_schema=None):
    """Apply enhanced SQL optimizations to the database."""
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
            
            # Add index on stock_quantity for faster filtering
            cursor.execute("CREATE INDEX IF NOT EXISTS inventory_product_stock_quantity_idx ON inventory_product(stock_quantity);")
            logger.info("Created index on inventory_product(stock_quantity)")
            
            # Add index on is_for_sale for faster filtering
            cursor.execute("CREATE INDEX IF NOT EXISTS inventory_product_is_for_sale_idx ON inventory_product(is_for_sale);")
            logger.info("Created index on inventory_product(is_for_sale)")
            
            # Add composite index on department_id and stock_quantity for department-specific inventory queries
            cursor.execute("CREATE INDEX IF NOT EXISTS inventory_product_dept_stock_idx ON inventory_product(department_id, stock_quantity);")
            logger.info("Created composite index on inventory_product(department_id, stock_quantity)")
            
            # Add index on updated_at for change tracking
            cursor.execute("CREATE INDEX IF NOT EXISTS inventory_product_updated_at_idx ON inventory_product(updated_at);")
            logger.info("Created index on inventory_product(updated_at)")
            
            # Add partial index for low stock items (stock_quantity < reorder_level)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS inventory_product_low_stock_idx 
                ON inventory_product(stock_quantity) 
                WHERE stock_quantity < reorder_level;
            """)
            logger.info("Created partial index for low stock items")
            
            # Add index on price for price-based queries
            cursor.execute("CREATE INDEX IF NOT EXISTS inventory_product_price_idx ON inventory_product(price);")
            logger.info("Created index on inventory_product(price)")
            
            # Add GIN index for text search on name and description
            cursor.execute("""
                CREATE EXTENSION IF NOT EXISTS pg_trgm;
                CREATE INDEX IF NOT EXISTS inventory_product_text_search_idx 
                ON inventory_product USING gin ((name || ' ' || COALESCE(description, '')) gin_trgm_ops);
            """)
            logger.info("Created GIN index for text search on name and description")
            
            # Optimize table storage
            cursor.execute("VACUUM ANALYZE inventory_product;")
            logger.info("Vacuumed and analyzed inventory_product table")
            
            # Verify a specific product exists (as mentioned in your requirements)
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM inventory_product 
                    WHERE product_code = 'SP001' 
                    LIMIT 1
                );
            """)
            exists = cursor.fetchone()[0]
            logger.info(f"Verified product SP001 exists: {exists}")
            
            return True
    except Exception as e:
        logger.error(f"Error applying enhanced SQL optimizations: {str(e)}", exc_info=True)
        return False

if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    
    # Get tenant schema from command line argument if provided
    import sys
    tenant_schema = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Apply optimizations
    success = apply_enhanced_optimizations(tenant_schema)
    
    if success:
        print("Enhanced SQL optimizations applied successfully.")
    else:
        print("Failed to apply enhanced SQL optimizations. Check the logs for details.")