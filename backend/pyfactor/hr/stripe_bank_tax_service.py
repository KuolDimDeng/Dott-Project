"""
Stripe Bank and Tax Information Service using Express Connect account
Securely stores employee banking and tax information in Stripe
"""
import stripe
from django.conf import settings
from pyfactor.logging_config import get_logger
import re
import hashlib
import json
from django.utils import timezone

logger = get_logger()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Import Express Connect account ID from config
from .stripe_config import STRIPE_EXPRESS_ACCOUNT_ID as EXPRESS_ACCOUNT_ID


class StripeBankTaxService:
    """Service for managing employee bank and tax information storage using Express Connect account"""
    
    @staticmethod
    def validate_routing_number(routing_number):
        """Validate US routing number format"""
        if not routing_number:
            return False, "Routing number is required"
        
        # Remove any non-digit characters
        routing_digits = re.sub(r'\D', '', routing_number)
        
        # Check if it's 9 digits
        if len(routing_digits) != 9:
            return False, "Routing number must be 9 digits"
        
        # Basic checksum validation for US routing numbers
        checksum = (
            3 * (int(routing_digits[0]) + int(routing_digits[3]) + int(routing_digits[6])) +
            7 * (int(routing_digits[1]) + int(routing_digits[4]) + int(routing_digits[7])) +
            (int(routing_digits[2]) + int(routing_digits[5]) + int(routing_digits[8]))
        )
        
        if checksum % 10 != 0:
            return False, "Invalid routing number"
        
        return True, routing_digits
    
    @staticmethod
    def validate_account_number(account_number):
        """Validate bank account number format"""
        if not account_number:
            return False, "Account number is required"
        
        # Remove any non-digit characters
        account_digits = re.sub(r'\D', '', account_number)
        
        # Check length (typically 4-17 digits)
        if len(account_digits) < 4 or len(account_digits) > 17:
            return False, "Account number must be between 4 and 17 digits"
        
        return True, account_digits
    
    @staticmethod
    def create_secure_hash(data_string):
        """Create a secure hash for sensitive data"""
        salt = f"dott-{EXPRESS_ACCOUNT_ID}".encode()
        return hashlib.sha256(salt + data_string.encode()).hexdigest()[:16]
    
    @staticmethod
    def store_bank_information(employee, bank_data):
        """
        Store bank information securely using platform's Express Connect account
        
        bank_data should contain:
        - routing_number: Bank routing number
        - account_number: Bank account number
        - account_type: 'checking' or 'savings'
        - bank_name: Optional bank name
        
        Returns: (success, message)
        """
        try:
            # Validate routing number
            is_valid, routing_or_error = StripeBankTaxService.validate_routing_number(
                bank_data.get('routing_number')
            )
            if not is_valid:
                return False, routing_or_error
            
            routing_digits = routing_or_error
            
            # Validate account number
            is_valid, account_or_error = StripeBankTaxService.validate_account_number(
                bank_data.get('account_number')
            )
            if not is_valid:
                return False, account_or_error
            
            account_digits = account_or_error
            
            # Create secure hashes
            routing_hash = StripeBankTaxService.create_secure_hash(routing_digits)
            account_hash = StripeBankTaxService.create_secure_hash(account_digits)
            
            logger.info(f"[StripeBankTax] Storing bank info for employee {employee.id}")
            
            # Ensure employee has a Stripe customer ID
            if not employee.stripe_account_id:
                # Create customer first
                customer_data = {
                    'email': employee.email,
                    'name': f"{employee.first_name} {employee.last_name}",
                    'description': f"Employee: {employee.email}",
                    'metadata': {
                        'employee_id': str(employee.id),
                        'business_id': str(employee.business_id),
                        'employee_number': employee.employee_number,
                        'type': 'employee_record',
                        'created_by': 'platform'
                    }
                }
                
                stripe_options = {'stripe_account': EXPRESS_ACCOUNT_ID}
                customer = stripe.Customer.create(**customer_data, **stripe_options)
                employee.stripe_account_id = customer.id
                employee.save(update_fields=['stripe_account_id'])
            
            # Store bank information as secure metadata
            secure_bank_data = {
                'routing_hash': routing_hash,
                'routing_last_4': routing_digits[-4:],
                'account_hash': account_hash,
                'account_last_4': account_digits[-4:],
                'account_type': bank_data.get('account_type', 'checking'),
                'bank_name': bank_data.get('bank_name', ''),
                'stored_date': str(timezone.now()),
                'platform_account': EXPRESS_ACCOUNT_ID
            }
            
            # Update customer with bank information
            stripe_options = {'stripe_account': EXPRESS_ACCOUNT_ID}
            stripe.Customer.modify(
                employee.stripe_account_id,
                metadata={
                    **stripe.Customer.retrieve(
                        employee.stripe_account_id, 
                        **stripe_options
                    ).metadata,
                    'bank_info': json.dumps(secure_bank_data)
                },
                **stripe_options
            )
            
            logger.info(f"[StripeBankTax] ✅ Bank info stored successfully for employee {employee.id}")
            
            return True, "Bank information stored securely in Stripe"
                
        except stripe.error.StripeError as e:
            logger.error(f"[StripeBankTax] Stripe error: {str(e)}")
            return False, f"Stripe error: {str(e)}"
        except Exception as e:
            logger.error(f"[StripeBankTax] Unexpected error: {str(e)}")
            return False, f"Failed to store bank information: {str(e)}"
    
    @staticmethod
    def store_tax_information(employee, tax_data):
        """
        Store tax information securely using platform's Express Connect account
        
        tax_data should contain:
        - filing_status: 'single', 'married_filing_jointly', etc.
        - allowances: Number of allowances (W-4)
        - additional_withholding: Additional amount to withhold
        - state_filing_status: State tax filing status
        - state_allowances: State tax allowances
        - tax_id_number: Optional tax ID (if different from SSN)
        
        Returns: (success, message)
        """
        try:
            logger.info(f"[StripeBankTax] Storing tax info for employee {employee.id}")
            
            # Ensure employee has a Stripe customer ID
            if not employee.stripe_account_id:
                # Create customer first
                customer_data = {
                    'email': employee.email,
                    'name': f"{employee.first_name} {employee.last_name}",
                    'description': f"Employee: {employee.email}",
                    'metadata': {
                        'employee_id': str(employee.id),
                        'business_id': str(employee.business_id),
                        'employee_number': employee.employee_number,
                        'type': 'employee_record',
                        'created_by': 'platform'
                    }
                }
                
                stripe_options = {'stripe_account': EXPRESS_ACCOUNT_ID}
                customer = stripe.Customer.create(**customer_data, **stripe_options)
                employee.stripe_account_id = customer.id
                employee.save(update_fields=['stripe_account_id'])
            
            # Store tax information as secure metadata
            secure_tax_data = {
                'filing_status': tax_data.get('filing_status', 'single'),
                'allowances': str(tax_data.get('allowances', 0)),
                'additional_withholding': str(tax_data.get('additional_withholding', 0)),
                'state_filing_status': tax_data.get('state_filing_status', ''),
                'state_allowances': str(tax_data.get('state_allowances', 0)),
                'stored_date': str(timezone.now()),
                'platform_account': EXPRESS_ACCOUNT_ID
            }
            
            # Handle tax ID if provided and different from SSN
            if tax_data.get('tax_id_number'):
                tax_id_digits = re.sub(r'\D', '', tax_data['tax_id_number'])
                if len(tax_id_digits) == 9:
                    secure_tax_data['tax_id_hash'] = StripeBankTaxService.create_secure_hash(tax_id_digits)
                    secure_tax_data['tax_id_last_4'] = tax_id_digits[-4:]
            
            # Update customer with tax information
            stripe_options = {'stripe_account': EXPRESS_ACCOUNT_ID}
            stripe.Customer.modify(
                employee.stripe_account_id,
                metadata={
                    **stripe.Customer.retrieve(
                        employee.stripe_account_id, 
                        **stripe_options
                    ).metadata,
                    'tax_info': json.dumps(secure_tax_data)
                },
                **stripe_options
            )
            
            logger.info(f"[StripeBankTax] ✅ Tax info stored successfully for employee {employee.id}")
            
            return True, "Tax information stored securely in Stripe"
                
        except stripe.error.StripeError as e:
            logger.error(f"[StripeBankTax] Stripe error: {str(e)}")
            return False, f"Stripe error: {str(e)}"
        except Exception as e:
            logger.error(f"[StripeBankTax] Unexpected error: {str(e)}")
            return False, f"Failed to store tax information: {str(e)}"
    
    @staticmethod
    def retrieve_bank_information(employee):
        """
        Retrieve bank information from Stripe
        Returns dict with last 4 digits and account type, or None
        """
        try:
            if not employee.stripe_account_id:
                return None
            
            customer = stripe.Customer.retrieve(
                employee.stripe_account_id,
                stripe_account=EXPRESS_ACCOUNT_ID
            )
            
            if customer.metadata and 'bank_info' in customer.metadata:
                bank_info = json.loads(customer.metadata['bank_info'])
                return {
                    'routing_last_4': bank_info.get('routing_last_4'),
                    'account_last_4': bank_info.get('account_last_4'),
                    'account_type': bank_info.get('account_type'),
                    'bank_name': bank_info.get('bank_name')
                }
            
            return None
            
        except Exception as e:
            logger.error(f"[StripeBankTax] Error retrieving bank info: {str(e)}")
            return None
    
    @staticmethod
    def retrieve_tax_information(employee):
        """
        Retrieve tax information from Stripe
        Returns dict with tax settings, or None
        """
        try:
            if not employee.stripe_account_id:
                return None
            
            customer = stripe.Customer.retrieve(
                employee.stripe_account_id,
                stripe_account=EXPRESS_ACCOUNT_ID
            )
            
            if customer.metadata and 'tax_info' in customer.metadata:
                tax_info = json.loads(customer.metadata['tax_info'])
                return {
                    'filing_status': tax_info.get('filing_status'),
                    'allowances': int(tax_info.get('allowances', 0)),
                    'additional_withholding': float(tax_info.get('additional_withholding', 0)),
                    'state_filing_status': tax_info.get('state_filing_status'),
                    'state_allowances': int(tax_info.get('state_allowances', 0)),
                    'tax_id_last_4': tax_info.get('tax_id_last_4')
                }
            
            return None
            
        except Exception as e:
            logger.error(f"[StripeBankTax] Error retrieving tax info: {str(e)}")
            return None
    
    @staticmethod
    def retrieve_ssn_information(employee):
        """
        Retrieve SSN information from Stripe
        Returns last 4 digits or None
        """
        try:
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
            logger.error(f"[StripeBankTax] Error retrieving SSN info: {str(e)}")
            return employee.ssn_last_four