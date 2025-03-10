import logging
from celery import shared_task
from django.db import connections, connection
from django.core.management import call_command

logger = logging.getLogger(__name__)

@shared_task
def monitor_database_connections():
    """
    Celery task to monitor database connections and clean up if necessary.
    """
    try:
        # Get current connection count
        with connection.cursor() as cursor:
            cursor.execute("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()")
            active_connections = cursor.fetchone()[0]
            
            cursor.execute("SHOW max_connections")
            max_connections = cursor.fetchone()[0]
            
            usage_percent = (active_connections / int(max_connections)) * 100
            
            logger.info(f"Database connection usage: {active_connections}/{max_connections} ({usage_percent:.1f}%)")
            
            # If usage is high, perform cleanup
            if usage_percent > 70:
                logger.warning(f"High connection usage detected: {usage_percent:.1f}%")
                
                # Close Django connections
                for conn in connections.all():
                    conn.close()
                
                # If usage is critical, terminate idle connections
                if usage_percent > 90:
                    logger.critical(f"Critical connection usage: {usage_percent:.1f}%")
                    call_command('monitor_db_connections', cleanup=True)
    
    except Exception as e:
        logger.error(f"Error monitoring database connections: {str(e)}")
        return False
    
    return True