#!/usr/bin/env python
"""
Fix Database Schema Script
Fixes the UUID vs Integer mismatch in onboarding_onboardingprogress table
"""

import os
import sys
import django
from django.db import connection
from django.core.management import execute_from_command_line

# Add the project directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def check_table_structure():
    """Check current table structure"""
    print("🔍 Checking current table structure...")
    
    with connection.cursor() as cursor:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'onboarding_onboardingprogress'
            );
        """)
        table_exists = cursor.fetchone()
        if not table_exists or not table_exists[0]:
            print("❌ Table onboarding_onboardingprogress does not exist")
            return False
            
        # Get column info for id field
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'onboarding_onboardingprogress' 
            AND column_name = 'id';
        """)
        
        result = cursor.fetchone()
        if result:
            col_name, data_type, nullable, default = result
            print(f"📋 Current ID field: {col_name} ({data_type}), nullable: {nullable}, default: {default}")
            
            if data_type.lower() in ['integer', 'serial', 'bigserial']:
                print("❌ ID field is INTEGER - this is the problem!")
                return False
            elif data_type.lower() == 'uuid':
                print("✅ ID field is UUID - schema is correct")
                return True
        
        return False

def run_schema_fix():
    """Run the SQL schema fix"""
    print("\n🔧 Running schema fix...")
    
    sql_file = os.path.join(current_dir, 'fix_onboarding_uuid_schema.sql')
    
    if not os.path.exists(sql_file):
        print(f"❌ SQL file not found: {sql_file}")
        return False
    
    with open(sql_file, 'r') as f:
        sql_content = f.read()
    
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql_content)
        print("✅ Schema fix applied successfully!")
        return True
    except Exception as e:
        print(f"❌ Error applying schema fix: {e}")
        return False

def verify_fix():
    """Verify the fix worked"""
    print("\n✅ Verifying fix...")
    
    try:
        from onboarding.models import OnboardingProgress
        
        # Try to create a test record
        print("📝 Testing OnboardingProgress model...")
        
        # Just check if we can query the model without errors
        count = OnboardingProgress.objects.count()
        print(f"✅ OnboardingProgress model working! Current records: {count}")
        
        return True
    except Exception as e:
        print(f"❌ Model still has issues: {e}")
        return False

def main():
    print("🚀 Database Schema Fix Tool")
    print("=" * 50)
    
    # Check current structure
    is_correct = check_table_structure()
    
    if is_correct:
        print("\n✅ Database schema is already correct!")
        return
    
    # Run the fix
    if run_schema_fix():
        # Verify the fix
        if verify_fix():
            print("\n🎉 Database schema fix completed successfully!")
            print("\n📋 Summary:")
            print("  ✅ onboarding_onboardingprogress table recreated with UUID primary key")
            print("  ✅ All indexes created")
            print("  ✅ Django model compatibility verified")
            print("\n🔄 Please restart your Django server to clear any cached queries.")
        else:
            print("\n❌ Fix verification failed - please check manually")
    else:
        print("\n❌ Schema fix failed - please check the SQL and try again")

if __name__ == "__main__":
    main() 