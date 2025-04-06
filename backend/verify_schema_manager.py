#!/usr/bin/env python3
"""
Schema Creation Verification Script

This script monitors the database for schema creation events and checks whether
schema creation is being properly managed by our centralized schema manager.
"""

import psycopg2
import argparse
import time
import os
import json
from datetime import datetime, timedelta
import sys
import requests

# Database connection parameters
DB_CONFIG = {
    'dbname': 'dott_main',
    'user': 'dott_admin',
    'password': os.environ.get('POSTGRES_PASSWORD', ''),
    'host': 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
    'port': '5432'
}

def connect_to_db():
    """Connect to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            dbname=DB_CONFIG['dbname'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port']
        )
        conn.autocommit = True
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def get_active_schemas(conn):
    """Get a list of tenant schemas in the database."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%';
    """)
    schemas = cursor.fetchall()
    cursor.close()
    return [schema[0] for schema in schemas]

def get_schema_creation_time(conn, schema_name):
    """Try to get the schema creation time."""
    cursor = conn.cursor()
    # Use pg_catalog to get schema creation time
    cursor.execute("""
        SELECT pg_catalog.obj_description(oid) as description
        FROM pg_namespace
        WHERE nspname = %s;
    """, [schema_name])
    creation_info = cursor.fetchone()
    cursor.close()
    
    # If not found in obj_description, check tenant table
    if not creation_info or not creation_info[0]:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT created_at FROM custom_auth_tenant WHERE schema_name = %s;
        """, [schema_name])
        tenant_info = cursor.fetchone()
        cursor.close()
        
        if tenant_info:
            return tenant_info[0]
    
    return None

def list_tables_in_schema(conn, schema_name):
    """List tables in a specific schema."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = %s;
    """, [schema_name])
    tables = cursor.fetchall()
    cursor.close()
    return [table[0] for table in tables]

def check_schema_manager_api(api_url, tenant_id):
    """Check if schema manager API correctly reports schema existence."""
    try:
        response = requests.get(f"{api_url}?tenantId={tenant_id}")
        if response.status_code == 200:
            return response.json()
        return {"error": f"API returned status code {response.status_code}"}
    except Exception as e:
        return {"error": str(e)}

def monitor_schema_creation(api_url=None, interval=5, duration=300):
    """
    Monitor schema creation in the database.
    
    Args:
        api_url: URL of the schema manager API for validation
        interval: Check interval in seconds
        duration: Total monitoring duration in seconds
    """
    conn = connect_to_db()
    
    # Get initial schemas
    initial_schemas = get_active_schemas(conn)
    schema_count = len(initial_schemas)
    
    print(f"\n=== Schema Monitoring Started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===")
    print(f"Initial schema count: {schema_count}")
    print(f"Monitoring for new schemas every {interval} seconds for {duration} seconds...\n")
    
    # Track schemas and their creation times
    schema_history = {}
    
    start_time = time.time()
    last_check_time = start_time
    
    try:
        while time.time() - start_time < duration:
            time.sleep(interval)
            
            # Check for new schemas
            current_schemas = get_active_schemas(conn)
            current_count = len(current_schemas)
            
            # Find new schemas
            new_schemas = [s for s in current_schemas if s not in initial_schemas]
            
            if new_schemas:
                print(f"\n[{datetime.now().strftime('%H:%M:%S')}] ⚠️ {len(new_schemas)} new schema(s) detected!")
                
                for schema in new_schemas:
                    # Get creation time
                    creation_time = get_schema_creation_time(conn, schema)
                    schema_history[schema] = {
                        'detected_at': datetime.now(),
                        'created_at': creation_time,
                        'tables': list_tables_in_schema(conn, schema)
                    }
                    
                    # Extract tenant ID from schema name
                    tenant_id = schema.replace('tenant_', '').replace('_', '-')
                    
                    print(f"  - Schema: {schema}")
                    print(f"    Created: {creation_time}")
                    print(f"    Tables: {', '.join(schema_history[schema]['tables'])}")
                    
                    # Check if API correctly reports this schema
                    if api_url:
                        api_result = check_schema_manager_api(api_url, tenant_id)
                        if 'error' in api_result:
                            print(f"    API Check: ❌ Error - {api_result['error']}")
                        elif api_result.get('schemaExists'):
                            print(f"    API Check: ✅ API correctly reports schema exists")
                        else:
                            print(f"    API Check: ❌ API reports schema does not exist")
                    
                    print()
                
                # Update our baseline
                initial_schemas = current_schemas
            else:
                sys.stdout.write(".")
                sys.stdout.flush()
    except KeyboardInterrupt:
        print("\n\nMonitoring stopped by user")
    finally:
        elapsed = time.time() - start_time
        print(f"\n=== Schema Monitoring Completed ===")
        print(f"Duration: {elapsed:.1f} seconds")
        print(f"Initial schema count: {schema_count}")
        print(f"Final schema count: {len(get_active_schemas(conn))}")
        
        # Report on all schemas detected during this run
        if schema_history:
            print("\nSchemas created during monitoring:")
            for schema, info in schema_history.items():
                print(f"  - {schema}")
                print(f"    Detected at: {info['detected_at']}")
                print(f"    Created at: {info['created_at']}")
                print(f"    Tables: {', '.join(info['tables'])}")
                print()
        
        conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Monitor schema creation in the database")
    parser.add_argument("-i", "--interval", type=int, default=5, 
                        help="Check interval in seconds (default: 5)")
    parser.add_argument("-d", "--duration", type=int, default=300, 
                        help="Total monitoring duration in seconds (default: 300)")
    parser.add_argument("-a", "--api", type=str, 
                        help="Schema manager API URL for validation")
    args = parser.parse_args()
    
    monitor_schema_creation(api_url=args.api, interval=args.interval, duration=args.duration) 