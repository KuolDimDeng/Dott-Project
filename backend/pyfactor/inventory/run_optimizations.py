#!/usr/bin/env python
"""
Script to run database optimizations for the inventory module.
This script should be run directly from the command line.
"""
import os
import sys
import django
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from pyfactor.custom_auth.models import Tenant
from inventory.sql_optimizations import apply_optimizations

def main():
    """Run optimizations for all tenant schemas."""
    start_time = datetime.now()
    logger.info(f"Starting database optimizations at {start_time}")
    
    # Get all active tenants
    try:
        tenants = Tenant.objects.filter(database_status='active')
        logger.info(f"Found {len(tenants)} active tenants")
        
        success_count = 0
        failure_count = 0
        
        # Apply optimizations to each tenant schema
        for tenant in tenants:
            logger.info(f"Applying optimizations to tenant: { tenant.id}")
            try:
                success = apply_optimizations( tenant.id)
                if success:
                    success_count += 1
                    logger.info(f"Successfully optimized tenant: { tenant.id}")
                else:
                    failure_count += 1
                    logger.error(f"Failed to optimize tenant: { tenant.id}")
            except Exception as e:
                failure_count += 1
                logger.error(f"Error optimizing tenant { tenant.id}: {str(e)}", exc_info=True)
        
        # Apply optimizations to public schema
        logger.info("Applying optimizations to public schema")
        try:
            success = apply_optimizations("public")
            if success:
                success_count += 1
                logger.info("Successfully optimized public schema")
            else:
                failure_count += 1
                logger.error("Failed to optimize public schema")
        except Exception as e:
            failure_count += 1
            logger.error(f"Error optimizing public schema: {str(e)}", exc_info=True)
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        logger.info(f"Optimization completed at {end_time}")
        logger.info(f"Total duration: {duration:.2f} seconds")
        logger.info(f"Success: {success_count}, Failures: {failure_count}")
        
    except Exception as e:
        logger.error(f"Error running optimizations: {str(e)}", exc_info=True)
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())