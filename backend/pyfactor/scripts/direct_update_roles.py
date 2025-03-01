# direct_update_roles.py
import os
import psycopg2
import sys

# Database connection parameters - adjust these to match your .env file or settings
DB_NAME = input("Enter database name: ")
DB_USER = input("Enter database user: ")
DB_PASSWORD = input("Enter database password: ")
DB_HOST = input("Enter database host (default: localhost): ") or "localhost"
DB_PORT = input("Enter database port (default: 5432): ") or "5432"

print(f"Connecting to {DB_NAME} on {DB_HOST}:{DB_PORT} as {DB_USER}...")

try:
    # Connect to the database
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
    conn.autocommit = True  # Set autocommit mode

    with conn.cursor() as cursor:
        # Get the table name for the User model
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public' 
            AND table_name LIKE '%_user'
        """)
        
        user_tables = cursor.fetchall()
        
        if not user_tables:
            print("Could not find user table in the database.")
            sys.exit(1)
        
        # Assuming the first match is our user table
        user_table = user_tables[0][0]
        print(f"Found user table: {user_table}")
        
        # Update all users with role='EMPLOYEE' to role='OWNER'
        cursor.execute(f"""
            UPDATE {user_table} 
            SET role='OWNER', occupation='OWNER' 
            WHERE role='EMPLOYEE'
        """)
        
        rows_affected = cursor.rowcount
        print(f"Updated {rows_affected} users from EMPLOYEE to OWNER role")
        
        # Verify the changes
        cursor.execute(f"""
            SELECT COUNT(*) FROM {user_table} WHERE role='OWNER'
        """)
        owner_count = cursor.fetchone()[0]
        
        cursor.execute(f"""
            SELECT COUNT(*) FROM {user_table} WHERE role='EMPLOYEE'
        """)
        employee_count = cursor.fetchone()[0]
        
        print(f"Current user roles: OWNER={owner_count}, EMPLOYEE={employee_count}")
    
    print("Update completed successfully!")

except Exception as e:
    print(f"Error: {str(e)}")
    sys.exit(1)
finally:
    if 'conn' in locals():
        conn.close()