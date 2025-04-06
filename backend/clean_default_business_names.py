#!/usr/bin/env python3
"""
Clean Default Business Names Script

This script identifies and marks any tenants with default business names
so they can be properly addressed by the application team.
"""

import psycopg2
import argparse
import os
import sys
from datetime import datetime

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

def get_default_name_tenants(conn):
    """Get tenants with default or generic business names."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, schema_name, created_at, owner_id
        FROM custom_auth_tenant
        WHERE name IN ('My Business', 'Default Business', '')
        ORDER BY created_at DESC;
    """)
    tenants = cursor.fetchall()
    cursor.close()
    return tenants

def get_tenant_users(conn, tenant_id):
    """Get users associated with a tenant."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, email, first_name, last_name
        FROM custom_auth_user
        WHERE tenant_id = %s;
    """, [tenant_id])
    users = cursor.fetchall()
    cursor.close()
    return users

def get_user_attributes(conn, user_id):
    """Get additional user attributes if available."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, key, value
        FROM user_attributes
        WHERE user_id = %s AND key = 'businessname';
    """, [user_id])
    attributes = cursor.fetchall()
    cursor.close()
    return attributes

def mark_tenant_for_review(conn, tenant_id, reason):
    """Mark tenant for review by setting a flag in the database."""
    cursor = conn.cursor()
    
    # Check if tenant_metadata table exists, create if not
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'tenant_metadata'
        );
    """)
    
    table_exists = cursor.fetchone()[0]
    
    if not table_exists:
        cursor.execute("""
            CREATE TABLE tenant_metadata (
                tenant_id UUID PRIMARY KEY REFERENCES custom_auth_tenant(id),
                needs_review BOOLEAN DEFAULT FALSE,
                review_reason TEXT,
                marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                fixed BOOLEAN DEFAULT FALSE,
                fixed_at TIMESTAMP WITH TIME ZONE,
                notes TEXT
            );
        """)
        print("Created tenant_metadata table")
    
    # Insert or update the tenant metadata
    cursor.execute("""
        INSERT INTO tenant_metadata (tenant_id, needs_review, review_reason)
        VALUES (%s, TRUE, %s)
        ON CONFLICT (tenant_id) 
        DO UPDATE SET 
            needs_review = TRUE, 
            review_reason = EXCLUDED.review_reason,
            marked_at = NOW();
    """, [tenant_id, reason])
    
    affected = cursor.rowcount
    cursor.close()
    return affected

def clean_tenant_names(conn, dry_run=True, mark_only=False):
    """
    Identify and optionally clean up generic business names.
    
    Args:
        conn: Database connection
        dry_run: If True, only report issues without making changes
        mark_only: If True, mark tenants for review instead of renaming
    """
    tenants = get_default_name_tenants(conn)
    
    if not tenants:
        print("No tenants with default business names found.")
        return
    
    print(f"\n=== Found {len(tenants)} tenants with default business names ===")
    
    fixed_count = 0
    marked_count = 0
    
    for tenant in tenants:
        tenant_id, name, schema_name, created_at, owner_id = tenant
        
        print(f"\nTenant: {tenant_id}")
        print(f"  Name: {name}")
        print(f"  Schema: {schema_name}")
        print(f"  Created: {created_at}")
        
        # Get users for this tenant
        users = get_tenant_users(conn, tenant_id)
        
        if users:
            print(f"  Users ({len(users)}):")
            for user in users:
                user_id, email, first_name, last_name = user
                print(f"    - {email} ({first_name} {last_name})")
                
                # Check if user has a businessname attribute
                attributes = get_user_attributes(conn, user_id)
                
                if attributes:
                    for attr_id, key, value in attributes:
                        if key == 'businessname' and value and value not in ('My Business', 'Default Business', ''):
                            print(f"      Found business name in attributes: {value}")
                            
                            if not dry_run and not mark_only:
                                try:
                                    cursor = conn.cursor()
                                    cursor.execute("""
                                        UPDATE custom_auth_tenant
                                        SET name = %s, updated_at = NOW()
                                        WHERE id = %s
                                    """, [value, tenant_id])
                                    
                                    if cursor.rowcount > 0:
                                        print(f"      ✅ Updated tenant name to: {value}")
                                        fixed_count += 1
                                    else:
                                        print(f"      ❌ Failed to update tenant name")
                                    
                                    cursor.close()
                                except Exception as e:
                                    print(f"      ❌ Error updating tenant name: {e}")
                            elif not dry_run and mark_only:
                                reason = f"Default business name, but found '{value}' in user attributes"
                                affected = mark_tenant_for_review(conn, tenant_id, reason)
                                if affected > 0:
                                    print(f"      ✅ Marked tenant for review with reason: {reason}")
                                    marked_count += 1
                                else:
                                    print(f"      ❌ Failed to mark tenant for review")
                            else:
                                print(f"      [DRY RUN] Would update tenant name to: {value}")
                            break
                
                # If no businessname attribute was found
                if not attributes and not dry_run and mark_only:
                    reason = f"Default business name '{name}', no alternative found in user attributes"
                    affected = mark_tenant_for_review(conn, tenant_id, reason)
                    if affected > 0:
                        print(f"      ✅ Marked tenant for review with reason: {reason}")
                        marked_count += 1
                    else:
                        print(f"      ❌ Failed to mark tenant for review")
        else:
            print("  No users found for this tenant")
            
            if not dry_run and mark_only:
                reason = f"Default business name '{name}', no users found"
                affected = mark_tenant_for_review(conn, tenant_id, reason)
                if affected > 0:
                    print(f"  ✅ Marked tenant for review with reason: {reason}")
                    marked_count += 1
                else:
                    print(f"  ❌ Failed to mark tenant for review")
    
    print("\n=== Summary ===")
    print(f"Total tenants with default names: {len(tenants)}")
    
    if not dry_run and not mark_only:
        print(f"Tenants fixed: {fixed_count}")
    elif not dry_run and mark_only:
        print(f"Tenants marked for review: {marked_count}")
    else:
        print("Dry run - no changes made")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean up default business names in tenant records")
    parser.add_argument("--dry-run", action="store_true", help="Report only, don't make changes")
    parser.add_argument("--mark", action="store_true", help="Mark tenants for review instead of renaming")
    args = parser.parse_args()
    
    conn = connect_to_db()
    try:
        clean_tenant_names(conn, args.dry_run, args.mark)
    finally:
        conn.close() 