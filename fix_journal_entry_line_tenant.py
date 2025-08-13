#!/usr/bin/env python3
"""
Fix missing tenant_id column in finance_journalentryline table
"""
import psycopg2
import os

# Database connection - use production settings
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/pyfactor')

def fix_tenant_id_column():
    """Add tenant_id column to finance_journalentryline if it doesn't exist"""
    
    conn = None
    cursor = None
    
    try:
        # Parse DATABASE_URL
        if DATABASE_URL.startswith('postgres://'):
            db_url = DATABASE_URL.replace('postgres://', 'postgresql://')
        else:
            db_url = DATABASE_URL
            
        print(f"Connecting to database...")
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Check if column exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'finance_journalentryline' 
            AND column_name = 'tenant_id'
        """)
        
        if cursor.fetchone():
            print("✅ tenant_id column already exists in finance_journalentryline")
        else:
            print("❌ tenant_id column missing, adding it now...")
            
            # Add tenant_id column
            cursor.execute("""
                ALTER TABLE finance_journalentryline 
                ADD COLUMN tenant_id UUID;
            """)
            
            # Create index for performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_finance_journalentryline_tenant_id 
                ON finance_journalentryline(tenant_id);
            """)
            
            # Update existing records to set tenant_id from business relationship
            cursor.execute("""
                UPDATE finance_journalentryline jel
                SET tenant_id = b.tenant_id
                FROM users_business b
                WHERE jel.business_id = b.id
                AND jel.tenant_id IS NULL;
            """)
            
            conn.commit()
            print("✅ Successfully added tenant_id column to finance_journalentryline")
            
            # Show count of updated records
            cursor.execute("SELECT COUNT(*) FROM finance_journalentryline WHERE tenant_id IS NOT NULL")
            count = cursor.fetchone()[0]
            print(f"   Updated {count} existing records with tenant_id")
        
        # Verify the table structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'finance_journalentryline'
            ORDER BY ordinal_position;
        """)
        
        print("\n📊 Current finance_journalentryline table structure:")
        for row in cursor.fetchall():
            print(f"   - {row[0]}: {row[1]} (nullable: {row[2]})")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        if conn:
            conn.rollback()
        return False
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            
    return True

if __name__ == "__main__":
    success = fix_tenant_id_column()
    if success:
        print("\n✅ Database fix completed successfully!")
    else:
        print("\n❌ Database fix failed!")