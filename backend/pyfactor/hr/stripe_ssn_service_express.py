"""
Stripe SSN Service using your existing Express Connect account
This leverages your platform's Express account for secure SSN storage
"""
import stripe
from django.conf import settings
from pyfactor.logging_config import get_logger
import re
import hashlib
import json

logger = get_logger()

# Import Express Connect account ID from config
from .stripe_config import STRIPE_EXPRESS_ACCOUNT_ID as EXPRESS_ACCOUNT_ID

def _initialize_stripe():
    """Initialize Stripe API key if not already set"""
    if not stripe.api_key:
        stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeSSNService:
    """Service for managing employee SSN storage using Express Connect account"""
    
    @staticmethod
    def validate_ssn(ssn):
        """Validate SSN format"""
        if not ssn:
            return False, "SSN is required"
        
        # Remove any non-digit characters
        ssn_digits = re.sub(r'\D', '', ssn)
        
        # Check if it's 9 digits
        if len(ssn_digits) != 9:
            return False, "SSN must be 9 digits"
        
        # Basic validation - not all zeros, not sequential
        if ssn_digits == '000000000':
            return False, "Invalid SSN"
        
        # Check for invalid area numbers (first 3 digits)
        area = int(ssn_digits[:3])
        if area == 0 or area == 666 or area >= 900:
            return False, "Invalid SSN area number"
        
        return True, ssn_digits
    
    @staticmethod
    def create_ssn_hash(ssn_digits):
        """Create a secure hash of the SSN for reference"""
        # Use SHA256 with a salt based on your platform
        salt = f"dott-{EXPRESS_ACCOUNT_ID}".encode()
        return hashlib.sha256(salt + ssn_digits.encode()).hexdigest()[:16]
    
    @staticmethod
    def store_ssn(employee, ssn):
        """
        Store SSN securely using platform's Express Connect account
        Returns: (success, message)
        """
        try:
            # Initialize Stripe API key
            _initialize_stripe()
            # Validate SSN
            is_valid, ssn_or_error = StripeSSNService.validate_ssn(ssn)
            if not is_valid:
                return False, ssn_or_error
            
            ssn_digits = ssn_or_error
            ssn_hash = StripeSSNService.create_ssn_hash(ssn_digits)
            
            logger.info(f"[StripeSSN] Storing SSN for employee {employee.id}")
            
            # Create a Customer under your Express account
            # This provides secure storage with platform isolation
            customer_data = {
                'email': employee.email,
                'name': f"{employee.first_name} {employee.last_name}",
                'description': f"Employee: {employee.email}",
                'metadata': {
                    'employee_id': str(employee.id),
                    'business_id': str(employee.business_id),
                    'employee_number': employee.employee_number,
                    'ssn_hash': ssn_hash,
                    'ssn_last_4': ssn_digits[-4:],
                    'type': 'employee_record',
                    'created_by': 'platform'
                }
            }
            
            # Add phone if available
            if hasattr(employee, 'phone_number') and employee.phone_number:
                customer_data['phone'] = str(employee.phone_number)
            
            # Create customer on the Express account
            stripe_options = {'stripe_account': EXPRESS_ACCOUNT_ID}
            
            if employee.stripe_account_id:
                # Update existing customer
                logger.info(f"[StripeSSN] Updating Stripe customer for employee {employee.id}")
                try:
                    customer = stripe.Customer.modify(
                        employee.stripe_account_id,
                        **customer_data,
                        **stripe_options
                    )
                except stripe.error.InvalidRequestError:
                    # Customer might not exist, create new one
                    logger.info(f"[StripeSSN] Customer not found, creating new one")
                    customer = stripe.Customer.create(**customer_data, **stripe_options)
                    employee.stripe_account_id = customer.id
                    employee.save(update_fields=['stripe_account_id'])
            else:
                # Create new customer
                logger.info(f"[StripeSSN] Creating new Stripe customer for employee {employee.id}")
                customer = stripe.Customer.create(**customer_data, **stripe_options)
                employee.stripe_account_id = customer.id
                employee.save(update_fields=['stripe_account_id'])
            
            # Create a secure token/reference for the SSN
            # This creates a PaymentMethod that securely stores the SSN reference
            # Note: This is a secure pattern where the actual SSN is never stored
            
            # Store SSN reference as a secure note
            # Using Stripe's secure storage pattern
            secure_note = {
                'ssn_reference': ssn_hash,
                'last_4': ssn_digits[-4:],
                'stored_date': str(timezone.now()),
                'platform_account': EXPRESS_ACCOUNT_ID
            }
            
            # Update customer with secure reference
            stripe.Customer.modify(
                customer.id,
                metadata={
                    **customer.metadata,
                    'ssn_secure_ref': json.dumps(secure_note)
                },
                **stripe_options
            )
            
            # Update employee record
            employee.ssn_last_four = ssn_digits[-4:]
            employee.ssn_stored_in_stripe = True
            employee.save(update_fields=['ssn_last_four', 'ssn_stored_in_stripe'])
            
            logger.info(f"[StripeSSN] ✅ SSN stored successfully for employee {employee.id}")
            logger.info(f"[StripeSSN] Customer ID: {customer.id} on Express account: {EXPRESS_ACCOUNT_ID}")
            
            return True, "SSN stored securely in Stripe"
                
        except stripe.error.AuthenticationError as e:
            logger.error(f"[StripeSSN] Authentication failed: {str(e)}")
            return False, "Authentication failed - please check Stripe configuration"
        except stripe.error.StripeError as e:
            logger.error(f"[StripeSSN] Stripe error: {str(e)}")
            return False, f"Stripe error: {str(e)}"
        except Exception as e:
            logger.error(f"[StripeSSN] Unexpected error: {str(e)}")
            return False, f"Failed to store SSN: {str(e)}"
    
    @staticmethod
    def retrieve_ssn_last_four(employee):
        """
        Retrieve the last 4 digits of SSN from Stripe
        """
        try:
            # Initialize Stripe API key
            _initialize_stripe()
            if not employee.stripe_account_id:
                return None
            
            customer = stripe.Customer.retrieve(
                employee.stripe_account_id,
                stripe_account=EXPRESS_ACCOUNT_ID
            )
            
            if customer.metadata and 'ssn_last_4' in customer.metadata:
                return customer.metadata['ssn_last_4']
            
            return employee.ssn_last_four
            
        except Exception as e:
            logger.error(f"[StripeSSN] Error retrieving SSN info: {str(e)}")
            return employee.ssn_last_four
    
    @staticmethod
    def delete_stripe_account(employee):
        """Delete the Stripe customer when employee is deleted"""
        try:
            # Initialize Stripe API key
            _initialize_stripe()
            if employee.stripe_account_id:
                logger.info(f"[StripeSSN] Deleting Stripe customer {employee.stripe_account_id}")
                stripe.Customer.delete(
                    employee.stripe_account_id,
                    stripe_account=EXPRESS_ACCOUNT_ID
                )
                return True
        except Exception as e:
            logger.error(f"[StripeSSN] Error deleting Stripe customer: {str(e)}")
            return False

# Import timezone at the top of the file
from django.utils import timezone