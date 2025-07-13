#!/usr/bin/env python3
"""
Production script to migrate existing employee SSNs to Stripe Connect
Run this AFTER add_stripe_ssn_fields_prod.py
"""
import os
import sys
import psycopg2
import stripe
import logging
import re
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get configuration from environment
DATABASE_URL = os.environ.get('DATABASE_URL')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')

if not DATABASE_URL:
    logger.error("DATABASE_URL environment variable not set")
    sys.exit(1)

if not STRIPE_SECRET_KEY:
    logger.error("STRIPE_SECRET_KEY environment variable not set")
    sys.exit(1)

# Initialize Stripe
stripe.api_key = STRIPE_SECRET_KEY

def validate_ssn(ssn):
    """Validate SSN format"""
    if not ssn:
        return False, "SSN is required"
    
    # Remove any non-digit characters
    ssn_digits = re.sub(r'\D', '', ssn)
    
    # Check if it's 9 digits
    if len(ssn_digits) != 9:
        return False, "SSN must be 9 digits"
    
    # Basic validation
    if ssn_digits == '000000000':
        return False, "Invalid SSN"
    
    # Check for invalid area numbers
    area = int(ssn_digits[:3])
    if area == 0 or area == 666 or area >= 900:
        return False, "Invalid SSN area number"
    
    return True, ssn_digits

def create_stripe_account(employee_data):
    """Create a Stripe Connect account for the employee"""
    try:
        account_data = {
            'type': 'custom',
            'country': employee_data['country'] or 'US',
            'email': employee_data['email'],
            'capabilities': {
                'card_payments': {'requested': False},
                'transfers': {'requested': False},
            },
            'business_type': 'individual',
            'individual': {
                'first_name': employee_data['first_name'],
                'last_name': employee_data['last_name'],
                'email': employee_data['email'],
            },
            'tos_acceptance': {
                'service_agreement': 'recipient'
            },
            'metadata': {
                'employee_id': str(employee_data['id']),
                'business_id': str(employee_data['business_id']),
                'type': 'employee_ssn_storage'
            }
        }
        
        # Add optional fields if available
        if employee_data.get('phone_number'):
            account_data['individual']['phone'] = employee_data['phone_number']
        
        if employee_data.get('date_of_birth'):
            dob = employee_data['date_of_birth']
            account_data['individual']['dob'] = {
                'day': dob.day,
                'month': dob.month,
                'year': dob.year
            }
        
        if employee_data.get('street'):
            account_data['individual']['address'] = {
                'line1': employee_data['street'] or '',
                'city': employee_data['city'] or '',
                'state': employee_data['state'] or '',
                'postal_code': employee_data['zip_code'] or '',
                'country': employee_data['country'] or 'US',
            }
        
        account = stripe.Account.create(**account_data)
        return account.id, None
        
    except stripe.error.StripeError as e:
        return None, str(e)

def store_ssn_in_stripe(account_id, ssn_digits, country='US'):
    """Store SSN in Stripe account"""
    try:
        if country == 'US' or not country:
            stripe.Account.modify(
                account_id,
                individual={
                    'id_number': ssn_digits,
                    'ssn_last_4': ssn_digits[-4:]
                }
            )
        else:
            stripe.Account.modify(
                account_id,
                individual={
                    'id_number': ssn_digits
                }
            )
        return True, None
    except stripe.error.StripeError as e:
        return False, str(e)

def migrate_ssns():
    """Migrate existing SSNs to Stripe"""
    
    stats = {
        'total': 0,
        'migrated': 0,
        'skipped': 0,
        'failed': 0,
        'no_ssn': 0,
        'already_in_stripe': 0
    }
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Check which SSN columns exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'hr_employee' 
            AND column_name IN ('ssn', 'ssn_encrypted', 'security_number')
        """)
        
        ssn_columns = [row[0] for row in cursor.fetchall()]
        if not ssn_columns:
            logger.warning("No SSN columns found - nothing to migrate")
            return True
        
        logger.info(f"Found SSN columns: {', '.join(ssn_columns)}")
        ssn_column = ssn_columns[0]  # Use the first found column
        
        # Get all employees
        cursor.execute(f"""
            SELECT 
                id, email, first_name, last_name, business_id,
                {ssn_column}, ssn_stored_in_stripe, stripe_account_id,
                country, phone_number, date_of_birth,
                street, city, state, zip_code
            FROM hr_employee
            WHERE business_id IS NOT NULL
            ORDER BY created_at
        """)
        
        employees = cursor.fetchall()
        stats['total'] = len(employees)
        
        logger.info(f"🔍 Found {stats['total']} employees to process")
        
        for emp in employees:
            (emp_id, email, first_name, last_name, business_id,
             ssn, ssn_stored_in_stripe, stripe_account_id,
             country, phone_number, date_of_birth,
             street, city, state, zip_code) = emp
            
            try:
                # Skip if already in Stripe
                if ssn_stored_in_stripe:
                    logger.info(f"⏭️  {email} - Already in Stripe")
                    stats['already_in_stripe'] += 1
                    continue
                
                # Skip if no SSN
                if not ssn:
                    logger.info(f"⏭️  {email} - No SSN")
                    stats['no_ssn'] += 1
                    continue
                
                # Validate SSN
                is_valid, ssn_or_error = validate_ssn(ssn)
                if not is_valid:
                    logger.error(f"❌ {email} - Invalid SSN: {ssn_or_error}")
                    stats['failed'] += 1
                    continue
                
                ssn_digits = ssn_or_error
                logger.info(f"🔄 Migrating {email}...")
                
                # Create Stripe account if needed
                if not stripe_account_id:
                    employee_data = {
                        'id': emp_id,
                        'email': email,
                        'first_name': first_name,
                        'last_name': last_name,
                        'business_id': business_id,
                        'country': country,
                        'phone_number': phone_number,
                        'date_of_birth': date_of_birth,
                        'street': street,
                        'city': city,
                        'state': state,
                        'zip_code': zip_code
                    }
                    
                    stripe_account_id, error = create_stripe_account(employee_data)
                    if error:
                        logger.error(f"❌ {email} - Failed to create Stripe account: {error}")
                        stats['failed'] += 1
                        continue
                    
                    # Update employee with Stripe account ID
                    cursor.execute("""
                        UPDATE hr_employee 
                        SET stripe_account_id = %s 
                        WHERE id = %s
                    """, (stripe_account_id, emp_id))
                
                # Store SSN in Stripe
                success, error = store_ssn_in_stripe(stripe_account_id, ssn_digits, country)
                if not success:
                    logger.error(f"❌ {email} - Failed to store SSN: {error}")
                    stats['failed'] += 1
                    continue
                
                # Update employee record
                cursor.execute(f"""
                    UPDATE hr_employee 
                    SET 
                        ssn_last_four = %s,
                        ssn_stored_in_stripe = TRUE,
                        {ssn_column} = NULL
                    WHERE id = %s
                """, (ssn_digits[-4:], emp_id))
                
                conn.commit()
                logger.info(f"✅ {email} - Migrated successfully")
                stats['migrated'] += 1
                
            except Exception as e:
                logger.error(f"❌ {email} - Error: {str(e)}")
                stats['failed'] += 1
                conn.rollback()
                continue
        
        cursor.close()
        conn.close()
        
        # Print summary
        logger.info("\n" + "="*50)
        logger.info("📊 MIGRATION SUMMARY")
        logger.info("="*50)
        logger.info(f"Total employees: {stats['total']}")
        logger.info(f"✅ Successfully migrated: {stats['migrated']}")
        logger.info(f"⏭️  Already in Stripe: {stats['already_in_stripe']}")
        logger.info(f"⏭️  No SSN to migrate: {stats['no_ssn']}")
        logger.info(f"❌ Failed: {stats['failed']}")
        logger.info("="*50)
        
        return stats['failed'] == 0
        
    except Exception as e:
        logger.error(f"❌ Critical error: {str(e)}")
        if 'conn' in locals():
            conn.close()
        return False

def main():
    """Main execution function"""
    logger.info("🚀 Starting SSN migration to Stripe...")
    logger.info(f"⚡ Using Stripe API Key: {STRIPE_SECRET_KEY[:7]}...")
    
    success = migrate_ssns()
    
    if success:
        logger.info("\n🎉 Migration completed successfully!")
        logger.info("🔐 All SSNs are now stored securely in Stripe")
        logger.info("🧹 Local SSN fields have been cleared")
    else:
        logger.error("\n❌ Migration completed with errors")
        
    return success

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)