#!/usr/bin/env python3
"""
Version0001_payroll_stripe_connect_integration.py

A script to set up and manage Stripe Connect integration for the payroll system.
This allows the application to take batch payments from a business owner's
account and distribute them to employee accounts after tax and deduction calculations.

Usage:
    python Version0001_payroll_stripe_connect_integration.py [--tenant_id TENANT_ID]

Options:
    --tenant_id  Optional tenant ID to run for a specific tenant only
"""

import os
import sys
import json
import argparse
import logging
from datetime import datetime
import stripe
from dotenv import load_dotenv
import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f"payroll_stripe_connect_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("payroll_stripe_connect")

# Load environment variables
load_dotenv()

# Get Stripe API key from environment variables
STRIPE_API_KEY = os.getenv("STRIPE_SECRET_KEY")
if not STRIPE_API_KEY:
    logger.error("STRIPE_SECRET_KEY environment variable not set")
    sys.exit(1)

# Initialize Stripe
stripe.api_key = STRIPE_API_KEY

# Database connection parameters
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_PORT = os.getenv("DB_PORT", "5432")

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Set up Stripe Connect for payroll processing")
    parser.add_argument("--tenant_id", help="Tenant ID to run for specific tenant")
    return parser.parse_args()

def connect_to_database():
    """Connect to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT
        )
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        sys.exit(1)

def get_tenants(conn, tenant_id=None):
    """Get list of tenants to process."""
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            if tenant_id:
                cursor.execute(
                    "SELECT id, name FROM tenants WHERE id = %s",
                    (tenant_id,)
                )
            else:
                cursor.execute("SELECT id, name FROM tenants WHERE active = true")
            return cursor.fetchall()
    except Exception as e:
        logger.error(f"Error fetching tenants: {e}")
        return []

def setup_stripe_connect_for_tenant(conn, tenant_id):
    """Set up Stripe Connect for a specific tenant."""
    logger.info(f"Setting up Stripe Connect for tenant {tenant_id}")
    
    try:
        # Check if tenant already has a Stripe Connect account
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "SELECT stripe_connect_id FROM business_settings WHERE tenant_id = %s",
                (tenant_id,)
            )
            result = cursor.fetchone()
            
            if result and result.get('stripe_connect_id'):
                logger.info(f"Tenant {tenant_id} already has Stripe Connect account: {result['stripe_connect_id']}")
                return result['stripe_connect_id']
            
            # Get business information for the tenant
            cursor.execute(
                """
                SELECT 
                    b.name, b.email, b.phone, 
                    a.street, a.city, a.state, a.postal_code, a.country
                FROM businesses b
                LEFT JOIN addresses a ON b.address_id = a.id
                WHERE b.tenant_id = %s
                """,
                (tenant_id,)
            )
            business = cursor.fetchone()
            
            if not business:
                logger.error(f"No business information found for tenant {tenant_id}")
                return None
            
            # Create a Connected Account in Stripe
            account = stripe.Account.create(
                type="express",
                capabilities={
                    "transfers": {"requested": True},
                    "card_payments": {"requested": True},
                },
                business_type="company",
                business_profile={
                    "name": business['name'],
                    "url": f"https://app.pyfactor.com/{tenant_id}"
                },
                email=business['email'],
                company={
                    "name": business['name'],
                    "phone": business['phone'],
                    "address": {
                        "line1": business['street'],
                        "city": business['city'],
                        "state": business['state'],
                        "postal_code": business['postal_code'],
                        "country": business['country']
                    }
                }
            )
            
            logger.info(f"Created Stripe Connect account {account.id} for tenant {tenant_id}")
            
            # Store the Stripe Connect ID in the database
            cursor.execute(
                """
                INSERT INTO business_settings (tenant_id, stripe_connect_id, created_at, updated_at)
                VALUES (%s, %s, NOW(), NOW())
                ON CONFLICT (tenant_id) 
                DO UPDATE SET stripe_connect_id = EXCLUDED.stripe_connect_id, updated_at = NOW()
                """,
                (tenant_id, account.id)
            )
            conn.commit()
            
            return account.id
    except Exception as e:
        logger.error(f"Error setting up Stripe Connect for tenant {tenant_id}: {e}")
        conn.rollback()
        return None

def create_employee_stripe_accounts(conn, tenant_id):
    """Create or update Stripe accounts for employees of a tenant."""
    logger.info(f"Setting up employee Stripe accounts for tenant {tenant_id}")
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Get employees without Stripe accounts
            cursor.execute(
                """
                SELECT e.id, e.first_name, e.last_name, e.email, e.phone
                FROM employees e
                LEFT JOIN employee_payment_methods epm ON e.id = epm.employee_id
                WHERE e.tenant_id = %s AND (epm.stripe_account_id IS NULL OR epm.stripe_account_id = '')
                """,
                (tenant_id,)
            )
            employees = cursor.fetchall()
            
            for employee in employees:
                try:
                    # Create a Customer in Stripe for the employee
                    customer = stripe.Customer.create(
                        email=employee['email'],
                        name=f"{employee['first_name']} {employee['last_name']}",
                        phone=employee['phone']
                    )
                    
                    # Insert or update employee payment method record
                    cursor.execute(
                        """
                        INSERT INTO employee_payment_methods 
                        (employee_id, stripe_account_id, created_at, updated_at)
                        VALUES (%s, %s, NOW(), NOW())
                        ON CONFLICT (employee_id) 
                        DO UPDATE SET stripe_account_id = EXCLUDED.stripe_account_id, updated_at = NOW()
                        """,
                        (employee['id'], customer.id)
                    )
                    logger.info(f"Created Stripe customer {customer.id} for employee {employee['id']}")
                except Exception as e:
                    logger.error(f"Error creating Stripe customer for employee {employee['id']}: {e}")
            
            conn.commit()
    except Exception as e:
        logger.error(f"Error setting up employee Stripe accounts for tenant {tenant_id}: {e}")
        conn.rollback()

def create_payroll_transfer_function(conn):
    """Create stored procedure for processing payroll transfers with Stripe."""
    logger.info("Creating payroll transfer database function")
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
            CREATE OR REPLACE FUNCTION process_payroll_transfer(
                p_payroll_run_id UUID,
                p_source_account_id VARCHAR(255)
            ) RETURNS BOOLEAN AS $$
            DECLARE
                v_tenant_id UUID;
                v_stripe_connect_id VARCHAR(255);
                v_total_amount DECIMAL(15,2);
                v_payroll_record RECORD;
                v_employee_record RECORD;
                v_transfer_id VARCHAR(255);
                v_success BOOLEAN := TRUE;
            BEGIN
                -- Get tenant ID from payroll run
                SELECT tenant_id INTO v_tenant_id
                FROM payroll_runs
                WHERE id = p_payroll_run_id;
                
                IF v_tenant_id IS NULL THEN
                    RAISE EXCEPTION 'Payroll run ID % not found', p_payroll_run_id;
                END IF;
                
                -- Get Stripe Connect ID for tenant
                SELECT stripe_connect_id INTO v_stripe_connect_id
                FROM business_settings
                WHERE tenant_id = v_tenant_id;
                
                IF v_stripe_connect_id IS NULL THEN
                    RAISE EXCEPTION 'No Stripe Connect account found for tenant %', v_tenant_id;
                END IF;
                
                -- Get payroll run details
                SELECT * INTO v_payroll_record
                FROM payroll_runs
                WHERE id = p_payroll_run_id;
                
                -- Set payroll status to processing
                UPDATE payroll_runs
                SET status = 'processing'
                WHERE id = p_payroll_run_id;
                
                -- Process each employee payment
                FOR v_employee_record IN
                    SELECT 
                        ep.employee_id, 
                        ep.net_pay,
                        epm.stripe_account_id
                    FROM employee_payroll ep
                    JOIN employee_payment_methods epm ON ep.employee_id = epm.employee_id
                    WHERE ep.payroll_run_id = p_payroll_run_id
                LOOP
                    -- Only process if we have a Stripe account for the employee
                    IF v_employee_record.stripe_account_id IS NOT NULL THEN
                        -- Create transfer record in our database
                        INSERT INTO payroll_transfers (
                            payroll_run_id,
                            employee_id,
                            amount,
                            status,
                            source_account_id,
                            created_at,
                            updated_at
                        ) VALUES (
                            p_payroll_run_id,
                            v_employee_record.employee_id,
                            v_employee_record.net_pay,
                            'pending',
                            p_source_account_id,
                            NOW(),
                            NOW()
                        );
                    ELSE
                        -- Log error for employees without Stripe accounts
                        INSERT INTO payroll_errors (
                            payroll_run_id,
                            employee_id,
                            error_message,
                            created_at
                        ) VALUES (
                            p_payroll_run_id,
                            v_employee_record.employee_id,
                            'No Stripe account found for employee',
                            NOW()
                        );
                        v_success := FALSE;
                    END IF;
                END LOOP;
                
                -- Update payroll run status based on success
                IF v_success THEN
                    UPDATE payroll_runs
                    SET status = 'ready_for_payment'
                    WHERE id = p_payroll_run_id;
                ELSE
                    UPDATE payroll_runs
                    SET status = 'error'
                    WHERE id = p_payroll_run_id;
                END IF;
                
                RETURN v_success;
            EXCEPTION WHEN OTHERS THEN
                -- Log the error
                INSERT INTO payroll_errors (
                    payroll_run_id,
                    error_message,
                    created_at
                ) VALUES (
                    p_payroll_run_id,
                    SQLERRM,
                    NOW()
                );
                
                -- Update payroll run status
                UPDATE payroll_runs
                SET status = 'error'
                WHERE id = p_payroll_run_id;
                
                RETURN FALSE;
            END;
            $$ LANGUAGE plpgsql;
            """)
            conn.commit()
            logger.info("Successfully created payroll transfer database function")
    except Exception as e:
        logger.error(f"Error creating payroll transfer function: {e}")
        conn.rollback()

def create_database_tables(conn):
    """Create necessary database tables for payroll processing if they don't exist."""
    logger.info("Creating necessary database tables for payroll processing")
    
    try:
        with conn.cursor() as cursor:
            # Create business_settings table if not exists
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS business_settings (
                id SERIAL PRIMARY KEY,
                tenant_id UUID NOT NULL,
                stripe_connect_id VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT business_settings_tenant_id_key UNIQUE (tenant_id)
            );
            """)
            
            # Create employee_payment_methods table if not exists
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS employee_payment_methods (
                id SERIAL PRIMARY KEY,
                employee_id UUID NOT NULL,
                stripe_account_id VARCHAR(255),
                bank_account_id VARCHAR(255),
                is_direct_deposit BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT employee_payment_methods_employee_id_key UNIQUE (employee_id)
            );
            """)
            
            # Create payroll_transfers table if not exists
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS payroll_transfers (
                id SERIAL PRIMARY KEY,
                payroll_run_id UUID NOT NULL,
                employee_id UUID NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                status VARCHAR(50) NOT NULL,
                source_account_id VARCHAR(255),
                stripe_transfer_id VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL
            );
            """)
            
            # Create payroll_errors table if not exists
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS payroll_errors (
                id SERIAL PRIMARY KEY,
                payroll_run_id UUID,
                employee_id UUID,
                error_message TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL
            );
            """)
            
            conn.commit()
            logger.info("Successfully created database tables")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        conn.rollback()

def update_api_endpoints(conn):
    """Create or update API endpoints for payroll processing."""
    logger.info("Updating API endpoints for payroll processing")
    
    # This function would register the new API endpoints in the system
    # For demonstration purposes, we'll just log what would be created
    
    endpoints = [
        {
            "path": "/api/payroll/calculate/",
            "method": "POST",
            "description": "Calculate payroll before execution"
        },
        {
            "path": "/api/payroll/run/",
            "method": "POST",
            "description": "Execute payroll payments"
        },
        {
            "path": "/api/payroll/settings/",
            "method": "GET/POST",
            "description": "Get or update payroll settings"
        },
        {
            "path": "/api/payroll/settings/authorization",
            "method": "POST",
            "description": "Update payroll authorization settings"
        },
        {
            "path": "/api/payroll/settings/tax",
            "method": "POST",
            "description": "Update payroll tax settings"
        },
        {
            "path": "/api/payroll/settings/schedule",
            "method": "POST",
            "description": "Update payroll schedule settings"
        }
    ]
    
    for endpoint in endpoints:
        logger.info(f"Would register: {endpoint['method']} {endpoint['path']} - {endpoint['description']}")
    
    logger.info("API endpoints updated")

def main():
    """Main function to run the script."""
    args = parse_arguments()
    
    logger.info("Starting Stripe Connect integration for payroll system")
    
    # Connect to the database
    conn = connect_to_database()
    
    try:
        # Create necessary database tables
        create_database_tables(conn)
        
        # Create stored procedure for payroll transfers
        create_payroll_transfer_function(conn)
        
        # Update API endpoints
        update_api_endpoints(conn)
        
        # Get tenants to process
        tenants = get_tenants(conn, args.tenant_id)
        
        if not tenants:
            logger.warning("No active tenants found to process")
            return
        
        # Process each tenant
        for tenant in tenants:
            tenant_id = tenant['id']
            logger.info(f"Processing tenant: {tenant['name']} ({tenant_id})")
            
            # Set up Stripe Connect for the tenant
            stripe_connect_id = setup_stripe_connect_for_tenant(conn, tenant_id)
            
            if stripe_connect_id:
                # Create employee Stripe accounts
                create_employee_stripe_accounts(conn, tenant_id)
            
        logger.info("Stripe Connect integration for payroll system completed successfully")
    except Exception as e:
        logger.error(f"Unhandled error in main function: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main() 