#!/usr/bin/env python
"""
Real-time PostgreSQL connection monitor and fixer.
This script will:
1. Monitor PostgreSQL connections continuously
2. Automatically terminate idle connections when usage is high
3. Alert when connection usage reaches critical levels
"""
import os
import sys
import time
import signal
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import argparse
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
        # File logging is handled by settings.py
    ]
)
logger = logging.getLogger(__name__)

# Database connection parameters
DB_PARAMS = {
    'dbname': 'dott_main',
    'user': 'dott_admin',
    'password': 'RRfXU6uPPUbBEg1JqGTJ',
    'host': 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
    'port': '5432'
}

# Thresholds for action
WARNING_THRESHOLD = 0.7  # 70% of max connections
CRITICAL_THRESHOLD = 0.9  # 90% of max connections
IDLE_TIMEOUT = 300  # 5 minutes in seconds

# Global flag for graceful shutdown
running = True

def signal_handler(sig, frame):
    """Handle Ctrl+C to gracefully exit"""
    global running
    logger.info("Shutdown signal received. Exiting gracefully...")
    running = False

def get_connection_stats(cursor):
    """Get current connection statistics"""
    # Get max connections
    cursor.execute("SHOW max_connections")
    max_connections = int(cursor.fetchone()[0])
    
    # Get current connections
    cursor.execute("""
        SELECT count(*) FROM pg_stat_activity 
        WHERE datname = %s
    """, (DB_PARAMS['dbname'],))
    active_connections = cursor.fetchone()[0]
    
    # Get idle connections
    cursor.execute("""
        SELECT count(*) FROM pg_stat_activity 
        WHERE datname = %s 
        AND state = 'idle' 
        AND (query_start < NOW() - INTERVAL '%s seconds' OR query_start IS NULL)
    """, (DB_PARAMS['dbname'], IDLE_TIMEOUT))
    idle_connections = cursor.fetchone()[0]
    
    # Calculate usage percentage
    usage_percent = (active_connections / max_connections) * 100
    
    return {
        'max': max_connections,
        'active': active_connections,
        'idle': idle_connections,
        'usage_percent': usage_percent
    }

def terminate_idle_connections(cursor, idle_timeout=IDLE_TIMEOUT):
    """Terminate idle connections"""
    cursor.execute("""
        SELECT pid FROM pg_stat_activity 
        WHERE datname = %s 
        AND state = 'idle' 
        AND (query_start < NOW() - INTERVAL '%s seconds' OR query_start IS NULL)
    """, (DB_PARAMS['dbname'], idle_timeout))
    
    idle_pids = [row[0] for row in cursor.fetchall()]
    
    if not idle_pids:
        logger.info("No idle connections to terminate")
        return 0
    
    for pid in idle_pids:
        try:
            cursor.execute("SELECT pg_terminate_backend(%s)", (pid,))
            logger.info(f"Terminated connection with PID: {pid}")
        except Exception as e:
            logger.error(f"Error terminating connection {pid}: {str(e)}")
    
    return len(idle_pids)

def list_connections(cursor, limit=20):
    """List active connections with details"""
    cursor.execute("""
        SELECT pid, usename, application_name, client_addr, 
               state, query_start, NOW() - query_start AS duration,
               LEFT(query, 100) AS query_preview
        FROM pg_stat_activity
        WHERE datname = %s
        ORDER BY query_start DESC NULLS LAST
        LIMIT %s
    """, (DB_PARAMS['dbname'], limit))
    
    connections = cursor.fetchall()
    
    if not connections:
        logger.info("No active connections found")
        return
    
    logger.info(f"{'PID':<8} {'User':<15} {'App':<20} {'State':<10} {'Duration':<15} {'Query Preview'}")
    logger.info("-" * 100)
    
    for conn in connections:
        pid, user, app, addr, state, start, duration, query = conn
        app = app or 'N/A'
        duration = str(duration) if duration else 'N/A'
        query = query or 'N/A'
        
        logger.info(f"{pid:<8} {user:<15} {app[:20]:<20} {state:<10} {duration:<15} {query[:50]}")

def monitor_loop(interval=10, auto_fix=False, verbose=False):
    """Main monitoring loop"""
    global running
    
    signal.signal(signal.SIGINT, signal_handler)
    
    logger.info(f"Starting PostgreSQL connection monitor (interval: {interval}s, auto-fix: {auto_fix})")
    logger.info(f"Press Ctrl+C to exit")
    
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_PARAMS)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        while running:
            try:
                # Get connection stats
                stats = get_connection_stats(cursor)
                
                # Log basic stats
                logger.info(f"Connections: {stats['active']}/{stats['max']} ({stats['usage_percent']:.1f}%), Idle: {stats['idle']}")
                
                # Show detailed connection info in verbose mode
                if verbose:
                    list_connections(cursor)
                
                # Check thresholds and take action
                if stats['usage_percent'] >= CRITICAL_THRESHOLD * 100:
                    logger.critical(f"CRITICAL: Connection usage at {stats['usage_percent']:.1f}%")
                    
                    # Always terminate idle connections at critical level
                    terminated = terminate_idle_connections(cursor)
                    logger.info(f"Terminated {terminated} idle connections")
                    
                elif stats['usage_percent'] >= WARNING_THRESHOLD * 100:
                    logger.warning(f"WARNING: Connection usage at {stats['usage_percent']:.1f}%")
                    
                    # Terminate idle connections if auto-fix is enabled
                    if auto_fix:
                        terminated = terminate_idle_connections(cursor)
                        logger.info(f"Terminated {terminated} idle connections")
                
                # Sleep until next check
                time.sleep(interval)
                
            except Exception as e:
                logger.error(f"Error during monitoring: {str(e)}")
                time.sleep(interval)
        
        # Clean up
        cursor.close()
        conn.close()
        
    except Exception as e:
        logger.error(f"Failed to connect to database: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='PostgreSQL Connection Monitor')
    parser.add_argument('--interval', type=int, default=10, help='Monitoring interval in seconds')
    parser.add_argument('--auto-fix', action='store_true', help='Automatically terminate idle connections when usage is high')
    parser.add_argument('--verbose', action='store_true', help='Show detailed connection information')
    
    args = parser.parse_args()
    
    sys.exit(monitor_loop(args.interval, args.auto_fix, args.verbose))