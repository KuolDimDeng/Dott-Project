"""
Stripe SSN Service for secure employee SSN storage
This service handles the secure storage of employee SSNs in Stripe Connect
following PCI compliance standards.
"""
import stripe
from django.conf import settings
from pyfactor.logging_config import get_logger
import re

logger = get_logger()

def _initialize_stripe():
    """Initialize Stripe API key if not already set"""
    if not stripe.api_key:
        stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeSSNService:
    """Service for managing employee SSN storage in Stripe"""
    
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
    def create_or_update_stripe_account(employee):
        """Create or update a Stripe Connect account for the employee"""
        try:
            # Initialize Stripe API key
            _initialize_stripe()
            account_data = {
                'type': 'custom',
                'country': employee.country or 'US',
                'email': employee.email,
                'capabilities': {
                    'card_payments': {'requested': False},
                    'transfers': {'requested': False},
                },
                'business_type': 'individual',
                'individual': {
                    'first_name': employee.first_name,
                    'last_name': employee.last_name,
                    'email': employee.email,
                    'phone': str(employee.phone_number) if employee.phone_number else None,
                    'dob': {
                        'day': employee.date_of_birth.day,
                        'month': employee.date_of_birth.month,
                        'year': employee.date_of_birth.year
                    } if employee.date_of_birth else None,
                    'address': {
                        'line1': employee.street or '',
                        'city': employee.city or '',
                        'state': employee.state or '',
                        'postal_code': employee.zip_code or '',
                        'country': employee.country or 'US',
                    }
                },
                'tos_acceptance': {
                    'service_agreement': 'recipient'
                },
                'metadata': {
                    'employee_id': str(employee.id),
                    'business_id': str(employee.business_id),
                    'type': 'employee_ssn_storage'
                }
            }
            
            if employee.stripe_account_id:
                # Update existing account
                logger.info(f"[StripeSSN] Updating Stripe account for employee {employee.id}")
                account = stripe.Account.modify(
                    employee.stripe_account_id,
                    **account_data
                )
            else:
                # Create new account
                logger.info(f"[StripeSSN] Creating new Stripe account for employee {employee.id}")
                account = stripe.Account.create(**account_data)
                employee.stripe_account_id = account.id
                employee.save(update_fields=['stripe_account_id'])
            
            return account
            
        except stripe.error.StripeError as e:
            logger.error(f"[StripeSSN] Stripe error creating/updating account: {str(e)}")
            raise Exception(f"Failed to create Stripe account: {str(e)}")
    
    @staticmethod
    def store_ssn(employee, ssn):
        """
        Store SSN securely in Stripe
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
            
            # Create or update Stripe account
            account = StripeSSNService.create_or_update_stripe_account(employee)
            
            # Update the account with SSN
            logger.info(f"[StripeSSN] Storing SSN for employee {employee.id}")
            
            # For US employees, update the individual with SSN
            if employee.country == 'US' or not employee.country:
                updated_account = stripe.Account.modify(
                    account.id,
                    individual={
                        'id_number': ssn_digits,  # Full SSN
                        'ssn_last_4': ssn_digits[-4:]  # Last 4 digits
                    }
                )
                
                # Store last 4 digits and mark as stored
                employee.ssn_last_four = ssn_digits[-4:]
                employee.ssn_stored_in_stripe = True
                employee.save(update_fields=['ssn_last_four', 'ssn_stored_in_stripe'])
                
                logger.info(f"[StripeSSN] ✅ SSN stored successfully for employee {employee.id}")
                return True, "SSN stored securely"
            else:
                # For non-US employees, use appropriate ID field
                updated_account = stripe.Account.modify(
                    account.id,
                    individual={
                        'id_number': ssn_digits  # Store as general ID number
                    }
                )
                
                employee.ssn_last_four = ssn_digits[-4:]
                employee.ssn_stored_in_stripe = True
                employee.save(update_fields=['ssn_last_four', 'ssn_stored_in_stripe'])
                
                logger.info(f"[StripeSSN] ✅ ID number stored successfully for employee {employee.id}")
                return True, "ID number stored securely"
                
        except stripe.error.InvalidRequestError as e:
            logger.error(f"[StripeSSN] Invalid request: {str(e)}")
            return False, f"Invalid data: {str(e)}"
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
        Note: Full SSN cannot be retrieved once stored
        """
        try:
            # Initialize Stripe API key
            _initialize_stripe()
            if not employee.stripe_account_id:
                return None
            
            account = stripe.Account.retrieve(employee.stripe_account_id)
            if account.individual and hasattr(account.individual, 'ssn_last_4'):
                return account.individual.ssn_last_4
            
            return employee.ssn_last_four
            
        except Exception as e:
            logger.error(f"[StripeSSN] Error retrieving SSN info: {str(e)}")
            return employee.ssn_last_four
    
    @staticmethod
    def delete_stripe_account(employee):
        """Delete the Stripe account when employee is deleted"""
        try:
            # Initialize Stripe API key
            _initialize_stripe()
            if employee.stripe_account_id:
                logger.info(f"[StripeSSN] Deleting Stripe account {employee.stripe_account_id}")
                stripe.Account.delete(employee.stripe_account_id)
                return True
        except Exception as e:
            logger.error(f"[StripeSSN] Error deleting Stripe account: {str(e)}")
            return False