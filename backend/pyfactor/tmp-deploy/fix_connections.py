#!/usr/bin/env python
"""
Emergency script to fix PostgreSQL connection issues.
This script will:
1. Connect to your PostgreSQL database
2. Show current connection count
3. Terminate idle connections
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Database connection parameters
DB_PARAMS = {
    'dbname': 'dott_main',
    'user': 'dott_admin',
    'password': 'RRfXU6uPPUbBEg1JqGTJ',
    'host': 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
    'port': '5432'
}

def main():
    """Main function to fix connection issues"""
    print("PostgreSQL Connection Fixer")
    print("===========================")
    
    try:
        # Connect to database
        print("Connecting to database...")
        conn = psycopg2.connect(**DB_PARAMS)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Get current connections
        cursor.execute("SELECT count(*) FROM pg_stat_activity WHERE datname = %s", (DB_PARAMS['dbname'],))
        active_connections = cursor.fetchone()[0]
        
        # Get max connections
        cursor.execute("SHOW max_connections")
        max_connections = cursor.fetchone()[0]
        
        print(f"Current connections: {active_connections}/{max_connections}")
        
        # List connections
        cursor.execute("""
            SELECT pid, usename, application_name, client_addr, 
                   backend_start, state, query_start, query
            FROM pg_stat_activity
            WHERE datname = %s
            ORDER BY state, query_start DESC
        """, (DB_PARAMS['dbname'],))
        
        rows = cursor.fetchall()
        
        print("\nActive connections:")
        print("-------------------")
        for row in rows:
            pid, user, app, addr, start, state, query_start, query = row
            print(f"PID: {pid}, User: {user}, State: {state}, App: {app}")
        
        # Terminate idle connections
        if input("\nTerminate idle connections? (y/n): ").lower() == 'y':
            cursor.execute("""
                SELECT count(*) FROM pg_stat_activity 
                WHERE datname = %s AND state = 'idle'
            """, (DB_PARAMS['dbname'],))
            
            idle_count = cursor.fetchone()[0]
            
            if idle_count > 0:
                cursor.execute("""
                    SELECT pg_terminate_backend(pid) 
                    FROM pg_stat_activity 
                    WHERE datname = %s AND state = 'idle'
                """, (DB_PARAMS['dbname'],))
                
                print(f"Terminated {idle_count} idle connections")
            else:
                print("No idle connections to terminate")
        
        # Terminate all connections
        if input("\nTerminate ALL connections (except this one)? (y/n): ").lower() == 'y':
            cursor.execute("""
                SELECT count(*) FROM pg_stat_activity 
                WHERE datname = %s AND pid <> pg_backend_pid()
            """, (DB_PARAMS['dbname'],))
            
            conn_count = cursor.fetchone()[0]
            
            if conn_count > 0:
                cursor.execute("""
                    SELECT pg_terminate_backend(pid) 
                    FROM pg_stat_activity 
                    WHERE datname = %s AND pid <> pg_backend_pid()
                """, (DB_PARAMS['dbname'],))
                
                print(f"Terminated {conn_count} connections")
            else:
                print("No other connections to terminate")
        
        # Get updated connection count
        cursor.execute("SELECT count(*) FROM pg_stat_activity WHERE datname = %s", (DB_PARAMS['dbname'],))
        new_active_connections = cursor.fetchone()[0]
        
        print(f"\nNew connection count: {new_active_connections}/{max_connections}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())