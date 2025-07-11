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

def check_employees():
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
        print("EMPLOYEE DATABASE CHECK (Direct SQL)")
        print("=" * 80)
        
        # Check total employees
        cursor.execute("SELECT COUNT(*) FROM hr_employee")
        total = cursor.fetchone()[0]
        print(f"\nTotal employees in hr_employee table: {total}")
        
        # List all employees
        print("\nAll employees in the database:")
        print("-" * 80)
        cursor.execute("""
            SELECT 
                e.id, 
                e.employee_number, 
                e.business_id, 
                e.email, 
                e.first_name, 
                e.last_name,
                e.active,
                e.created_at,
                b.name
            FROM hr_employee e
            LEFT JOIN users_business b ON e.business_id = b.id
            ORDER BY e.created_at DESC
        """)
        
        employees = cursor.fetchall()
        if not employees:
            print("No employees found in the database.")
        else:
            for emp in employees:
                print(f"ID: {emp[0]}")
                print(f"  Employee Number: {emp[1]}")
                print(f"  Business ID: {emp[2]}")
                print(f"  Business Name: {emp[8] or 'N/A'}")
                print(f"  Email: {emp[3]}")
                print(f"  Name: {emp[4]} {emp[5]}")
                print(f"  Active: {emp[6]}")
                print(f"  Created: {emp[7]}")
                print("-" * 40)
        
        # Check for support@dottapps.com user
        print("\nChecking for support@dottapps.com user:")
        print("-" * 80)
        cursor.execute("""
            SELECT id, email, business_id 
            FROM custom_auth_user 
            WHERE email = 'support@dottapps.com'
        """)
        user = cursor.fetchone()
        
        if user:
            print(f"User found: {user[1]}")
            print(f"  User ID: {user[0]}")
            print(f"  Business ID: {user[2]}")
            
            if user[2]:
                # Check employees for this business
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM hr_employee 
                    WHERE business_id = %s
                """, (user[2],))
                emp_count = cursor.fetchone()[0]
                print(f"  Employees for this business: {emp_count}")
                
                # Check business details
                cursor.execute("""
                    SELECT id, name, owner_id 
                    FROM users_business 
                    WHERE id = %s
                """, (user[2],))
                business = cursor.fetchone()
                
                if business:
                    print(f"\nBusiness details:")
                    print(f"  Business Name: {business[1]}")
                    print(f"  Business ID: {business[0]}")
                    print(f"  Owner ID: {business[2]}")
        else:
            print("User support@dottapps.com not found!")
        
        # Check all businesses and their employee counts
        print("\nAll businesses and their employee counts:")
        print("-" * 80)
        cursor.execute("""
            SELECT 
                b.id, 
                b.name,
                b.owner_id,
                COUNT(e.id) as employee_count
            FROM users_business b
            LEFT JOIN hr_employee e ON b.id = e.business_id
            GROUP BY b.id, b.name, b.owner_id
            ORDER BY b.name
        """)
        
        businesses = cursor.fetchall()
        for biz in businesses:
            print(f"Business: {biz[1]} (ID: {biz[0]})")
            print(f"  Owner ID: {biz[2]}")
            print(f"  Employee Count: {biz[3]}")
            print("-" * 40)
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    check_employees()