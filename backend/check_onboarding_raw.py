#!/usr/bin/env python3
"""
Minimal script to check onboarding status using raw SQL
"""

import os
import psycopg2
from urllib.parse import urlparse

# Try to get database URL from environment or .env file
database_url = os.environ.get('DATABASE_URL')

if not database_url:
    # Try to read from .env file
    env_path = os.path.join(os.path.dirname(__file__), 'pyfactor', '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    database_url = line.split('=', 1)[1].strip().strip('"\'')
                    break

if not database_url:
    print("ERROR: Could not find DATABASE_URL")
    print("Please set DATABASE_URL environment variable or create a .env file")
    exit(1)

# Parse the database URL
url = urlparse(database_url)

try:
    # Connect to PostgreSQL with SSL
    conn = psycopg2.connect(
        host=url.hostname,
        port=url.port or 5432,
        user=url.username,
        password=url.password,
        database=url.path[1:],  # Remove leading slash
        sslmode='require'
    )
    
    cursor = conn.cursor()
    
    email = 'support@dottapps.com'
    tenant_id = 'cef1e5de-c8b8-4e7f-875d-4821030d5af0'
    
    print("=" * 80)
    print(f"Checking onboarding status for: {email}")
    print(f"Tenant ID: {tenant_id}")
    print("=" * 80)
    
    # Check OnboardingProgress table
    print("\n1. OnboardingProgress Table:")
    print("-" * 40)
    try:
        cursor.execute("""
            SELECT 
                op.id,
                op.user_id,
                op.tenant_id,
                op.current_step,
                op.completed_steps,
                op.onboarding_status,
                op.setup_completed,
                op.completed_at,
                op.created_at,
                op.updated_at
            FROM onboarding_onboardingprogress op
            JOIN users_user u ON op.user_id = u.id
            WHERE u.email = %s
        """, [email])
        
        columns = [col[0] for col in cursor.description]
        results = cursor.fetchall()
        
        if results:
            for row in results:
                print("\nOnboardingProgress Record:")
                for i, col in enumerate(columns):
                    value = row[i]
                    if col == 'completed_steps' and value:
                        # Pretty print JSON array
                        import json
                        try:
                            value = json.dumps(json.loads(value)) if isinstance(value, str) else value
                        except:
                            pass
                    print(f"  {col}: {value}")
        else:
            print("  No OnboardingProgress records found")
    except Exception as e:
        print(f"  Error querying OnboardingProgress: {e}")
    
    # Check User table
    print("\n\n2. User Table:")
    print("-" * 40)
    try:
        cursor.execute("""
            SELECT 
                id,
                email,
                tenant_id,
                is_active,
                date_joined,
                last_login
            FROM users_user
            WHERE email = %s
        """, [email])
        
        columns = [col[0] for col in cursor.description]
        results = cursor.fetchall()
        
        if results:
            for row in results:
                print("\nUser Record:")
                for i, col in enumerate(columns):
                    print(f"  {col}: {row[i]}")
        else:
            print("  No User record found")
    except Exception as e:
        print(f"  Error querying User: {e}")
    
    # Check if onboarding_completed field exists in User table
    print("\n\n3. Check if onboarding_completed exists in User table:")
    print("-" * 40)
    try:
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users_user' 
            AND column_name = 'onboarding_completed'
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"  Column exists: {result[0]} ({result[1]})")
            
            # Get the value
            cursor.execute("""
                SELECT onboarding_completed
                FROM users_user
                WHERE email = %s
            """, [email])
            
            result = cursor.fetchone()
            if result:
                print(f"  Value for {email}: {result[0]}")
        else:
            print("  Column 'onboarding_completed' does NOT exist in users_user table")
    except Exception as e:
        print(f"  Error checking column: {e}")
    
    # Summary
    print("\n\n4. SUMMARY:")
    print("-" * 40)
    
    # Get final status
    cursor.execute("""
        SELECT 
            CASE 
                WHEN op.setup_completed = true OR op.onboarding_status = 'complete' THEN 'YES'
                ELSE 'NO'
            END as onboarding_completed,
            op.current_step,
            op.onboarding_status,
            op.setup_completed
        FROM users_user u
        LEFT JOIN onboarding_onboardingprogress op ON u.id = op.user_id
        WHERE u.email = %s
    """, [email])
    
    result = cursor.fetchone()
    if result:
        print(f"  Onboarding Completed: {result[0]}")
        print(f"  Current Step: {result[1]}")
        print(f"  Onboarding Status: {result[2]}")
        print(f"  Setup Completed: {result[3]}")
    else:
        print("  No data found")
    
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 80)
    print("Check completed!")
    print("=" * 80)
    
except psycopg2.Error as e:
    print(f"Database connection error: {e}")
    exit(1)
except Exception as e:
    print(f"Unexpected error: {e}")
    exit(1)