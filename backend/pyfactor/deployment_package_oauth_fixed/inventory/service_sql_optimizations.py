"""
Enhanced SQL optimizations for services.
This module provides functions to optimize database performance for service-related operations.
"""
from django.db import connections, transaction as db_transaction
import logging

logger = logging.getLogger(__name__)

def apply_service_optimizations():
    """
    Apply database optimizations for services.
    This function creates indexes and optimizes the database for service-related queries.
    """
    try:
        with db_transaction.atomic():
            with connections['default'].cursor() as cursor:
                # Add index on created_at for faster sorting
                cursor.execute("CREATE INDEX IF NOT EXISTS inventory_service_created_at_idx ON inventory_service(created_at);")
                logger.info("Created index on inventory_service(created_at)")
                
                # Add index on service_code for faster lookups
                cursor.execute("CREATE INDEX IF NOT EXISTS inventory_service_service_code_idx ON inventory_service(service_code);")
                logger.info("Created index on inventory_service(service_code)")
                
                # Add index on name for faster text searches
                cursor.execute("CREATE INDEX IF NOT EXISTS inventory_service_name_idx ON inventory_service(name);")
                logger.info("Created index on inventory_service(name)")
                
                # Add index on is_recurring for faster filtering
                cursor.execute("CREATE INDEX IF NOT EXISTS inventory_service_is_recurring_idx ON inventory_service(is_recurring);")
                logger.info("Created index on inventory_service(is_recurring)")
                
                # Add index on is_for_sale for faster filtering
                cursor.execute("CREATE INDEX IF NOT EXISTS inventory_service_is_for_sale_idx ON inventory_service(is_for_sale);")
                logger.info("Created index on inventory_service(is_for_sale)")
                
                # Add index on price for price-based queries
                cursor.execute("CREATE INDEX IF NOT EXISTS inventory_service_price_idx ON inventory_service(price);")
                logger.info("Created index on inventory_service(price)")
                
                # Add composite index for common filter combinations
                cursor.execute("CREATE INDEX IF NOT EXISTS inventory_service_sale_recurring_idx ON inventory_service(is_for_sale, is_recurring);")
                logger.info("Created composite index on inventory_service(is_for_sale, is_recurring)")
                
                # Add index on updated_at for change tracking
                cursor.execute("CREATE INDEX IF NOT EXISTS inventory_service_updated_at_idx ON inventory_service(updated_at);")
                logger.info("Created index on inventory_service(updated_at)")
                
                # Add text search capabilities
                try:
                    cursor.execute("""
                        CREATE EXTENSION IF NOT EXISTS pg_trgm;
                        CREATE INDEX IF NOT EXISTS inventory_service_text_search_idx
                        ON inventory_service USING gin ((name || ' ' || COALESCE(description, '')) gin_trgm_ops);
                    """)
                    logger.info("Created text search index on inventory_service")
                except Exception as e:
                    logger.warning(f"Could not create text search index: {str(e)}")
                
                # Optimize table storage
                cursor.execute("VACUUM ANALYZE inventory_service;")
                logger.info("Vacuumed and analyzed inventory_service table")
                
                # Verify a specific service exists (for testing)
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1 FROM inventory_service
                        LIMIT 1
                    )
                """)
                exists = cursor.fetchone()[0]
                logger.info(f"Verified service table has records: {exists}")
                
    except Exception as e:
        logger.error(f"Error applying service optimizations: {str(e)}", exc_info=True)
        raise

def monitor_service_performance():
    """
    Monitor service query performance.
    This function collects statistics about service queries to help identify performance issues.
    """
    try:
        with connections['default'].cursor() as cursor:
            # Get table statistics
            cursor.execute("""
                SELECT relname, n_live_tup, n_dead_tup, last_vacuum, last_analyze
                FROM pg_stat_user_tables
                WHERE relname = 'inventory_service'
            """)
            stats = cursor.fetchone()
            
            if stats:
                logger.info(f"Service table stats: {stats[0]}, live rows: {stats[1]}, dead rows: {stats[2]}, "
                           f"last vacuum: {stats[3]}, last analyze: {stats[4]}")
            
            # Get index usage statistics
            cursor.execute("""
                SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
                FROM pg_stat_user_indexes
                WHERE relname = 'inventory_service'
                ORDER BY idx_scan DESC
            """)
            index_stats = cursor.fetchall()
            
            for stat in index_stats:
                logger.info(f"Service index usage: {stat[0]}, scans: {stat[1]}, tuples read: {stat[2]}, tuples fetched: {stat[3]}")
            
    except Exception as e:
        logger.error(f"Error monitoring service performance: {str(e)}", exc_info=True)