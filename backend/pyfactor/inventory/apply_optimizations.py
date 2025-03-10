#!/usr/bin/env python
"""
Script to apply all inventory optimizations.
This script applies database optimizations for products and services,
and sets up monitoring for performance.
"""
import os
import sys
import django
import logging
import time
from datetime import datetime

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('optimization.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

def main():
    """
    Main function to apply all optimizations.
    """
    start_time = time.time()
    logger.info("Starting inventory optimizations")
    
    # Import optimization modules
    try:
        from inventory.enhanced_sql_optimizations import apply_product_optimizations
        from inventory.service_sql_optimizations import apply_service_optimizations, monitor_service_performance
        
        # Apply product optimizations
        logger.info("Applying product optimizations...")
        apply_product_optimizations()
        logger.info("Product optimizations applied successfully")
        
        # Apply service optimizations
        logger.info("Applying service optimizations...")
        apply_service_optimizations()
        logger.info("Service optimizations applied successfully")
        
        # Monitor performance
        logger.info("Monitoring performance...")
        monitor_service_performance()
        logger.info("Performance monitoring completed")
        
        # Set up Redis cache if available
        try:
            from django.core.cache import cache
            cache.set('inventory_optimization_last_run', datetime.now().isoformat(), 86400)
            logger.info("Cache configuration verified")
        except Exception as e:
            logger.warning(f"Cache configuration could not be verified: {str(e)}")
        
        # Apply bulk operation optimizations
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                # Optimize for bulk operations
                cursor.execute("SET work_mem = '16MB';")
                cursor.execute("SET maintenance_work_mem = '128MB';")
                logger.info("Database configured for bulk operations")
        except Exception as e:
            logger.warning(f"Could not optimize for bulk operations: {str(e)}")
        
        elapsed_time = time.time() - start_time
        logger.info(f"All optimizations completed successfully in {elapsed_time:.2f} seconds")
        
    except Exception as e:
        logger.error(f"Error applying optimizations: {str(e)}", exc_info=True)
        return 1
    
    return 0

if __name__ == '__main__':
    sys.exit(main())