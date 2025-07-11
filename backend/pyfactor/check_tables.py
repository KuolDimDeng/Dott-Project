import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection parameters
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'pyfactor')
DB_USER = os.getenv('DB_USER', 'pyfactor')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'pyfactor')

def check_tables():
    try:
        # Connect to the database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cursor = conn.cursor()
        
        print("=" * 80)
        print("DATABASE TABLES CHECK")
        print("=" * 80)
        
        # Get all tables
        cursor.execute("""
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        print(f"\nTotal tables in public schema: {len(tables)}")
        print("\nTables list:")
        print("-" * 40)
        for schema, table in tables:
            print(f"  {schema}.{table}")
            
        # Check specifically for hr_employee table
        print("\nChecking hr_employee table structure:")
        print("-" * 40)
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'hr_employee'
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        if columns:
            for col in columns:
                print(f"  {col[0]}: {col[1]} (Nullable: {col[2]})")
        else:
            print("  Table hr_employee not found!")
            
        # Check for business-related tables
        print("\nChecking for business-related tables:")
        print("-" * 40)
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%business%'
        """)
        
        business_tables = cursor.fetchall()
        for table in business_tables:
            print(f"  {table[0]}")
            
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    check_tables()