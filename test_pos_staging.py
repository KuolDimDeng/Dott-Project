#!/usr/bin/env python3
"""
Test if POS schema is fixed in staging by checking the database directly.
"""

import psycopg2
import os
import sys
from urllib.parse import urlparse

def test_staging_schema():
    # Get staging database URL (you'll need to set this)
    staging_url = os.environ.get('STAGING_DATABASE_URL')
    
    if not staging_url:
        print("❌ Please set STAGING_DATABASE_URL environment variable")
        print("   You can get this from Render dashboard → Database → External Connection String")
        return False
    
    try:
        # Parse connection string
        parsed = urlparse(staging_url)
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            database=parsed.path.lstrip('/'),
            user=parsed.username,
            password=parsed.password,
            sslmode='require'
        )
        
        print("✅ Connected to staging database")
        
        with conn.cursor() as cursor:
            # Check finance_journalentryline table
            cursor.execute("""
                SELECT 
                    column_name 
                FROM information_schema.columns 
                WHERE table_name = 'finance_journalentryline'
                AND column_name IN ('tenant_id', 'business_id')
                ORDER BY column_name
            """)
            
            columns = [row[0] for row in cursor.fetchall()]
            
            print("\n📋 finance_journalentryline columns:")
            if 'business_id' in columns:
                print("  ✅ business_id exists")
            else:
                print("  ❌ business_id MISSING")
            
            if 'tenant_id' in columns:
                print("  ✅ tenant_id exists")
            else:
                print("  ❌ tenant_id MISSING")
            
            # Check row counts
            cursor.execute("SELECT COUNT(*) FROM finance_journalentryline")
            count = cursor.fetchone()[0]
            print(f"  📊 Total rows: {count}")
            
            if 'business_id' in columns and 'tenant_id' in columns:
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total,
                        COUNT(tenant_id) as with_tenant,
                        COUNT(business_id) as with_business
                    FROM finance_journalentryline
                """)
                stats = cursor.fetchone()
                print(f"  📊 Rows with tenant_id: {stats[1]}/{stats[0]}")
                print(f"  📊 Rows with business_id: {stats[2]}/{stats[0]}")
                
                print("\n✅ POS schema is FIXED in staging!")
                return True
            else:
                print("\n❌ POS schema still needs fixing")
                return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    if test_staging_schema():
        print("\n" + "="*50)
        print("READY TO DEPLOY TO PRODUCTION")
        print("="*50)
        print("\nRun these commands:")
        print("  cd /Users/kuoldeng/projectx")
        print("  git checkout main")
        print("  git merge staging")
        print("  git push origin main")
        sys.exit(0)
    else:
        print("\n⚠️  Wait for deployment to complete or check logs")
        sys.exit(1)