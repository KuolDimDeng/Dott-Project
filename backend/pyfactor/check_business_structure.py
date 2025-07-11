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

def check_business_structure():
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
        print("BUSINESS TABLE STRUCTURE CHECK")
        print("=" * 80)
        
        # Check users_business table structure
        print("\nChecking users_business table structure:")
        print("-" * 40)
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users_business'
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        for col in columns:
            print(f"  {col[0]}: {col[1]} (Nullable: {col[2]})")
            
        # Check custom_auth_user structure  
        print("\nChecking custom_auth_user table structure:")
        print("-" * 40)
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'custom_auth_user'
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        for col in columns:
            print(f"  {col[0]}: {col[1]} (Nullable: {col[2]})")
            
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    check_business_structure()