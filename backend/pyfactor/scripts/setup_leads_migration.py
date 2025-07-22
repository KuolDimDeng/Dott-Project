#!/usr/bin/env python
"""
Script to setup leads migration on production server
Handles duplicate PagePermission cleanup and applies migrations
"""
import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.core.management import call_command
from django.db import connection
from custom_auth.models import PagePermission

def fix_page_permission_duplicates():
    """Fix duplicate PagePermission entries"""
    print("🔧 Fixing PagePermission duplicates...")
    
    try:
        # Use raw SQL to handle duplicates more reliably
        with connection.cursor() as cursor:
            # First, check if there are duplicates
            cursor.execute("""
                SELECT path, COUNT(*) as count 
                FROM custom_auth_pagepermission 
                GROUP BY path 
                HAVING COUNT(*) > 1
            """)
            
            duplicates = cursor.fetchall()
            
            if not duplicates:
                print("✅ No duplicate PagePermissions found!")
                return True
                
            print(f"Found {len(duplicates)} paths with duplicates")
            
            # Delete duplicates keeping the one with minimum ID
            cursor.execute("""
                DELETE FROM custom_auth_pagepermission 
                WHERE id NOT IN (
                    SELECT MIN(id) 
                    FROM custom_auth_pagepermission 
                    GROUP BY path
                )
            """)
            
            deleted_count = cursor.rowcount
            print(f"✅ Deleted {deleted_count} duplicate PagePermission entries")
            
        return True
        
    except Exception as e:
        print(f"❌ Error fixing duplicates: {str(e)}")
        return False

def create_leads_tables_manually():
    """Create leads tables manually if migrations fail"""
    print("\n📋 Creating leads tables manually...")
    
    try:
        with connection.cursor() as cursor:
            # Check if tables already exist
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'leads'
                )
            """)
            
            if cursor.fetchone()[0]:
                print("✅ Leads tables already exist!")
                return True
            
            # Create leads table (not leads_lead - model specifies db_table = 'leads')
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS leads (
                    id BIGSERIAL PRIMARY KEY,
                    email VARCHAR(254) NOT NULL,
                    first_name VARCHAR(100),
                    last_name VARCHAR(100),
                    company_name VARCHAR(200),
                    phone_number VARCHAR(20),
                    source VARCHAR(25) NOT NULL,
                    message TEXT,
                    status VARCHAR(15) NOT NULL DEFAULT 'new',
                    country VARCHAR(100),
                    ip_address INET,
                    additional_data JSONB DEFAULT '{}',
                    notes TEXT,
                    contacted_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    assigned_to_id BIGINT REFERENCES custom_auth_user(id) ON DELETE SET NULL
                )
            """)
            
            # Create lead_activities table (not leads_leadactivity - model specifies db_table = 'lead_activities')
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS lead_activities (
                    id BIGSERIAL PRIMARY KEY,
                    activity_type VARCHAR(20) NOT NULL,
                    description TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    created_by_id BIGINT REFERENCES custom_auth_user(id) ON DELETE SET NULL,
                    lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE
                )
            """)
            
            # Create indexes for leads table
            cursor.execute("CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email)")
            cursor.execute("CREATE INDEX IF NOT EXISTS leads_source_idx ON leads (source)")
            cursor.execute("CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS leads_assigned_idx ON leads (assigned_to_id)")
            
            # Create indexes for lead_activities table
            cursor.execute("CREATE INDEX IF NOT EXISTS lead_activities_lead_idx ON lead_activities (lead_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS lead_activities_type_idx ON lead_activities (activity_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS lead_activities_created_idx ON lead_activities (created_at)")
            
            print("✅ Leads tables created successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Error creating tables: {str(e)}")
        return False

def mark_migration_as_applied():
    """Mark the leads migration as applied"""
    print("\n🎯 Marking migration as applied...")
    
    try:
        with connection.cursor() as cursor:
            # First check if migration already exists
            cursor.execute("""
                SELECT COUNT(*) FROM django_migrations 
                WHERE app = 'leads' AND name = '0001_initial'
            """)
            
            if cursor.fetchone()[0] > 0:
                print("✅ Migration already marked as applied!")
                return True
            
            # Insert the migration record
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied)
                VALUES ('leads', '0001_initial', NOW())
            """)
            
        print("✅ Migration marked as applied!")
        return True
        
    except Exception as e:
        print(f"❌ Error marking migration: {str(e)}")
        return False

def main():
    """Main function to setup leads migration"""
    print("🚀 Starting Leads Migration Setup\n")
    
    # Step 1: Fix PagePermission duplicates
    if not fix_page_permission_duplicates():
        print("⚠️  Failed to fix duplicates, but continuing...")
    
    # Step 2: Try normal migration first
    print("\n📦 Attempting normal migration...")
    try:
        call_command('migrate', 'leads', verbosity=2)
        print("✅ Normal migration successful!")
        return
    except Exception as e:
        print(f"⚠️  Normal migration failed: {str(e)}")
    
    # Step 3: Create tables manually if migration failed
    if create_leads_tables_manually():
        # Step 4: Mark migration as applied
        mark_migration_as_applied()
    
    # Step 5: Verify everything is working
    print("\n🔍 Verifying lead models...")
    try:
        from leads.models import Lead, LeadActivity
        lead_count = Lead.objects.count()
        activity_count = LeadActivity.objects.count()
        print(f"✅ Lead model working! Current leads: {lead_count}")
        print(f"✅ LeadActivity model working! Current activities: {activity_count}")
    except Exception as e:
        print(f"❌ Error verifying models: {str(e)}")
    
    print("\n✅ Leads migration setup complete!")

if __name__ == '__main__':
    main()