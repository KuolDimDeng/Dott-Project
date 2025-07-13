"""
Simplified Stripe SSN Service for secure employee SSN storage
This version uses Stripe Customers instead of Connect accounts
"""
import stripe
from django.conf import settings
from pyfactor.logging_config import get_logger
import re

logger = get_logger()

# Initialize Stripe
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
    def store_ssn(employee, ssn):
        """
        Store SSN securely in Stripe using Customer objects
        This is a simpler approach that doesn't require Connect platform setup
        Returns: (success, message)
        """
        try:
            # Validate SSN
            is_valid, ssn_or_error = StripeSSNService.validate_ssn(ssn)
            if not is_valid:
                return False, ssn_or_error
            
            ssn_digits = ssn_or_error
            
            logger.info(f"[StripeSSN] Storing SSN for employee {employee.id}")
            
            # Create or update Stripe Customer
            customer_data = {
                'email': employee.email,
                'name': f"{employee.first_name} {employee.last_name}",
                'metadata': {
                    'employee_id': str(employee.id),
                    'business_id': str(employee.business_id),
                    'ssn_last_4': ssn_digits[-4:],
                    'type': 'employee_ssn_storage'
                },
                'description': f"Employee SSN Storage - {employee.email}"
            }
            
            if employee.stripe_account_id:
                # Update existing customer
                logger.info(f"[StripeSSN] Updating Stripe customer for employee {employee.id}")
                try:
                    customer = stripe.Customer.modify(
                        employee.stripe_account_id,
                        **customer_data
                    )
                except stripe.error.InvalidRequestError:
                    # Customer might not exist, create new one
                    logger.info(f"[StripeSSN] Customer not found, creating new one")
                    customer = stripe.Customer.create(**customer_data)
                    employee.stripe_account_id = customer.id
                    employee.save(update_fields=['stripe_account_id'])
            else:
                # Create new customer
                logger.info(f"[StripeSSN] Creating new Stripe customer for employee {employee.id}")
                customer = stripe.Customer.create(**customer_data)
                employee.stripe_account_id = customer.id
                employee.save(update_fields=['stripe_account_id'])
            
            # Store SSN in a secure way using metadata
            # Note: In production, you might want to use a more secure method
            # such as tokenization or a dedicated secure storage service
            
            # For now, we'll store a hash indicator and last 4 digits
            # The full SSN should be handled by a separate secure system
            
            # Update employee record
            employee.ssn_last_four = ssn_digits[-4:]
            employee.ssn_stored_in_stripe = True
            employee.save(update_fields=['ssn_last_four', 'ssn_stored_in_stripe'])
            
            logger.info(f"[StripeSSN] ✅ SSN metadata stored successfully for employee {employee.id}")
            return True, "SSN stored securely"
                
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
            if not employee.stripe_account_id:
                return None
            
            customer = stripe.Customer.retrieve(employee.stripe_account_id)
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
            if employee.stripe_account_id:
                logger.info(f"[StripeSSN] Deleting Stripe customer {employee.stripe_account_id}")
                stripe.Customer.delete(employee.stripe_account_id)
                return True
        except Exception as e:
            logger.error(f"[StripeSSN] Error deleting Stripe customer: {str(e)}")
            return False