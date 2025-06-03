#!/usr/bin/env python3
"""
Verify database connection for Django application
"""
import os
import psycopg2
from psycopg2 import OperationalError

def test_database_connection():
    """Test PostgreSQL database connection"""
    try:
        # Database connection parameters
        db_params = {
            'host': os.getenv('RDS_HOSTNAME', 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com'),
            'port': os.getenv('RDS_PORT', '5432'),
            'database': os.getenv('RDS_DB_NAME', 'dottapps'),
            'user': os.getenv('RDS_USERNAME', 'dott_admin'),
            'password': os.getenv('RDS_PASSWORD', '')
        }
        
        print("🔍 Testing database connection...")
        print(f"Host: {db_params['host']}")
        print(f"Port: {db_params['port']}")
        print(f"Database: {db_params['database']}")
        print(f"User: {db_params['user']}")
        
        # Attempt connection
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()
        
        # Test query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"✅ Connection successful!")
        print(f"PostgreSQL version: {version}")
        
        # Test Django tables (if they exist)
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name LIKE 'django_%'
        """)
        django_tables = cursor.fetchall()
        
        if django_tables:
            print(f"📋 Found {len(django_tables)} Django tables")
        else:
            print("📋 No Django tables found (migrations needed)")
        
        cursor.close()
        conn.close()
        return True
        
    except OperationalError as e:
        print(f"❌ Database connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == '__main__':
    # Set environment variables for testing
    os.environ['RDS_HOSTNAME'] = 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com'
    os.environ['RDS_PORT'] = '5432'
    os.environ['RDS_DB_NAME'] = 'dottapps'
    os.environ['RDS_USERNAME'] = 'dott_admin'
    
    # Prompt for password if not set
    if not os.getenv('RDS_PASSWORD'):
        import getpass
        os.environ['RDS_PASSWORD'] = getpass.getpass("Enter database password: ")
    
    success = test_database_connection()
    exit(0 if success else 1)
