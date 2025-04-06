#!/usr/bin/env python
import os
import psycopg2
import json

def check_tenant_records():
    """Connect to the database and check tenant records"""
    print("Connecting to AWS RDS database...")
    
    # Use the RDS credentials from the frontend config for consistency
    try:
        conn = psycopg2.connect(
            host='dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
            database='dott_main',
            user='dott_admin',
            password='RRfXU6uPPUbBEg1JqGTJ',
            port=5432,
            sslmode='require'
        )
        
        print("Connected to database successfully!")
        
        # Create a cursor for executing queries
        cur = conn.cursor()
        
        # Query tenant records
        print("\nChecking tenant records:")
        cur.execute("SELECT id, name, schema_name, owner_id, created_at FROM custom_auth_tenant ORDER BY created_at DESC LIMIT 10")
        rows = cur.fetchall()
        
        if not rows:
            print("No tenant records found.")
        else:
            print(f"Found {len(rows)} tenant records:")
            for row in rows:
                tenant_id, name, schema_name, owner_id, created_at = row
                print(f"- ID: {tenant_id}, Name: {name}, Schema: {schema_name}, Created: {created_at}")
        
        # Check schemas
        print("\nChecking tenant schemas:")
        cur.execute("SELECT nspname AS schema_name FROM pg_catalog.pg_namespace WHERE nspname LIKE 'tenant_%' ORDER BY nspname LIMIT 20")
        schemas = cur.fetchall()
        
        if not schemas:
            print("No tenant schemas found.")
        else:
            print(f"Found {len(schemas)} tenant schemas:")
            for schema in schemas:
                print(f"- {schema[0]}")
        
        # Close cursor and connection
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    check_tenant_records()