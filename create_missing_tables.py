"""
Script to check for and create missing tables in the database.
This helps recover from migration errors by manually creating necessary tables.
"""

import os
import sys
import psycopg2
import uuid
from datetime import datetime

# Add the project root to the path so we can import Django settings
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend/pyfactor')))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pyfactor.settings")

# Get database settings from environment variables or use defaults
DB_NAME = os.environ.get('DB_NAME', 'dott_main')
DB_USER = os.environ.get('DB_USER', 'dott_admin')
DB_PASS = os.environ.get('DB_PASSWORD', '')
DB_HOST = os.environ.get('DB_HOST', 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com')
DB_PORT = os.environ.get('DB_PORT', '5432')

def connect_to_db():
    """Connect to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            host=DB_HOST,
            port=DB_PORT
        )
        conn.autocommit = True
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def check_table_exists(cursor, table_name):
    """Check if a table exists in the database."""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = %s
        );
    """, (table_name,))
    return cursor.fetchone()[0]

def create_users_business_table(cursor):
    """Create the users_business table."""
    if not check_table_exists(cursor, 'users_business'):
        print("Creating users_business table...")
        cursor.execute("""
            CREATE TABLE users_business (
                id uuid PRIMARY KEY,
                name varchar(255) NOT NULL,
                business_name varchar(255),
                business_type varchar(100),
                country_id uuid NULL,
                legal_structure varchar(100) NULL,
                industry varchar(100) NULL,
                employee_count integer NULL,
                annual_revenue numeric(15,2) NULL,
                tax_id varchar(50) NULL,
                registration_number varchar(50) NULL,
                website varchar(255) NULL,
                phone varchar(50) NULL,
                address_line1 varchar(255) NULL,
                address_line2 varchar(255) NULL,
                city varchar(100) NULL,
                state_province varchar(100) NULL,
                postal_code varchar(20) NULL,
                created_at timestamp with time zone DEFAULT now() NOT NULL,
                updated_at timestamp with time zone DEFAULT now() NOT NULL,
                owner_id uuid NULL,
                logo_url varchar(512) NULL,
                status varchar(20) DEFAULT 'active' NOT NULL
            );
        """)
        print("users_business table created successfully")
    else:
        print("users_business table already exists")

def create_userprofile_table(cursor):
    """Create the users_userprofile table."""
    if not check_table_exists(cursor, 'users_userprofile'):
        print("Creating users_userprofile table...")
        cursor.execute("""
            CREATE TABLE users_userprofile (
                id uuid PRIMARY KEY,
                user_id uuid NOT NULL UNIQUE REFERENCES custom_auth_user(id) ON DELETE CASCADE,
                business_id uuid NULL REFERENCES users_business(id) ON DELETE SET NULL,
                schema_name varchar(63) NULL,
                database_setup_task_id varchar(255) NULL,
                last_setup_attempt timestamptz NULL,
                setup_error_message text NULL,
                metadata jsonb NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now()
            );
        """)
        print("users_userprofile table created successfully")
    else:
        print("users_userprofile table already exists")

def create_onboarding_progress_table(cursor):
    """Create the onboarding_onboardingprogress table."""
    if not check_table_exists(cursor, 'onboarding_onboardingprogress'):
        print("Creating onboarding_onboardingprogress table...")
        
        # First make sure custom_auth_user exists
        if not check_table_exists(cursor, 'custom_auth_user'):
            print("Error: custom_auth_user table doesn't exist. Please run migrations for custom_auth first.")
        else:
            cursor.execute("""
                CREATE TABLE onboarding_onboardingprogress (
                    id uuid PRIMARY KEY, 
                    user_id uuid NOT NULL UNIQUE REFERENCES custom_auth_user(id) ON DELETE CASCADE, 
                    business_id uuid NULL,
                    onboarding_status varchar(50) NOT NULL DEFAULT 'business-info',
                    current_step varchar(50) NOT NULL DEFAULT 'business-info', 
                    next_step varchar(50) NOT NULL DEFAULT 'subscription',
                    completed_steps jsonb NOT NULL DEFAULT '[]',
                    selected_plan varchar(20) NOT NULL DEFAULT 'free',
                    subscription_plan varchar(20) NULL DEFAULT 'free',
                    subscription_status varchar(20) NULL,
                    billing_cycle varchar(20) NULL DEFAULT 'monthly',
                    payment_completed boolean NOT NULL DEFAULT false,
                    payment_method varchar(50) NULL,
                    payment_id varchar(100) NULL,
                    payment_timestamp timestamptz NULL,
                    rls_setup_completed boolean NOT NULL DEFAULT false,
                    rls_setup_timestamp timestamptz NULL,
                    setup_completed boolean NOT NULL DEFAULT false,
                    setup_timestamp timestamptz NULL,
                    setup_error text NULL,
                    database_setup_task_id varchar(255) NULL,
                    schema_name varchar(63) NULL,
                    created_at timestamptz NOT NULL DEFAULT now(),
                    updated_at timestamptz NOT NULL DEFAULT now(),
                    completed_at timestamptz NULL,
                    account_status varchar(20) NOT NULL DEFAULT 'pending',
                    user_role varchar(20) NOT NULL DEFAULT 'owner',
                    attribute_version varchar(10) NOT NULL DEFAULT '1.0.0',
                    access_token_expiration timestamptz NULL,
                    last_active_step varchar(50) NULL,
                    last_login timestamptz NULL,
                    preferences jsonb NULL,
                    metadata jsonb NULL
                );
            """)
            print("onboarding_onboardingprogress table created successfully")
    else:
        print("onboarding_onboardingprogress table already exists")

def fix_rls_functions(cursor):
    """Fix the RLS SQL syntax issue with NULL values."""
    print("Fixing RLS function syntax...")
    cursor.execute("""
        CREATE OR REPLACE FUNCTION set_tenant_context() RETURNS VOID AS $$
        BEGIN
            PERFORM set_config('app.current_tenant_id', '', true);
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    cursor.execute("""
        CREATE OR REPLACE FUNCTION clear_tenant_context() RETURNS VOID AS $$
        BEGIN
            PERFORM set_config('app.current_tenant_id', '', true);
        END;
        $$ LANGUAGE plpgsql;
    """)
    print("RLS function syntax fixed")

def update_business_table(cursor):
    """Update the Business table to include the owner field."""
    if check_table_exists(cursor, 'users_business'):
        # Check if the owner_id column already exists
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'users_business' AND column_name = 'owner_id';
        """)
        if cursor.fetchone()[0] == 0:
            print("Adding owner_id column to users_business table...")
            cursor.execute("""
                ALTER TABLE users_business 
                ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES custom_auth_user(id) ON DELETE SET NULL;
            """)
            print("owner_id column added successfully")
        else:
            print("owner_id column already exists in users_business table")
    else:
        print("users_business table does not exist yet")

def check_and_create_missing_tables():
    """Check for missing tables and create them."""
    conn = connect_to_db()
    cursor = conn.cursor()
    
    try:
        print(f"Connected to database {DB_NAME} on {DB_HOST}")
        print("Checking for missing tables...")
        
        # Create tables
        create_users_business_table(cursor)
        update_business_table(cursor)
        create_userprofile_table(cursor)
        create_onboarding_progress_table(cursor)
        fix_rls_functions(cursor)
        
        # Add foreign key constraint if both tables exist
        if (check_table_exists(cursor, 'users_business') and 
            check_table_exists(cursor, 'onboarding_onboardingprogress')):
            print("Adding foreign key constraint from onboarding_progress to business...")
            try:
                # Check if constraint already exists
                cursor.execute("""
                    SELECT COUNT(*) FROM pg_constraint 
                    WHERE conname = 'onboarding_onboardin_business_id_a56ff4a1_fk_users_bus';
                """)
                if cursor.fetchone()[0] == 0:
                    cursor.execute("""
                        ALTER TABLE onboarding_onboardingprogress 
                        ADD CONSTRAINT onboarding_onboardin_business_id_a56ff4a1_fk_users_bus
                        FOREIGN KEY (business_id) REFERENCES users_business(id) 
                        DEFERRABLE INITIALLY DEFERRED;
                    """)
                    print("Foreign key constraint added successfully")
                else:
                    print("Foreign key constraint already exists")
            except Exception as e:
                print(f"Error adding foreign key constraint: {e}")
        
        print("\nTable creation completed.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    check_and_create_missing_tables() 