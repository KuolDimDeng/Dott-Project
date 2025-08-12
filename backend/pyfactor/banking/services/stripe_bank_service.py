"""
Stripe service for securely storing bank account information.
Uses Stripe Connect to store sensitive bank details.
"""
import stripe
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeBankService:
    """
    Service for securely storing bank account details in Stripe.
    """
    
    def __init__(self):
        self.stripe = stripe
        self.express_account_id = settings.STRIPE_EXPRESS_ACCOUNT_ID
    
    def create_bank_account_token(self, bank_details):
        """
        Create a bank account token in Stripe for secure storage.
        
        Args:
            bank_details: dict containing bank account information
            
        Returns:
            dict with token_id and last4 digits
        """
        try:
            country = bank_details.get('country', 'US').upper()
            
            # Build bank account data based on country
            bank_account_data = {
                'country': country,
                'currency': bank_details.get('currency', 'USD').lower(),
                'account_holder_name': bank_details.get('account_holder_name'),
                'account_holder_type': 'individual',  # or 'company'
            }
            
            # Add country-specific fields
            if country == 'US':
                bank_account_data['routing_number'] = bank_details.get('routing_number')
                bank_account_data['account_number'] = bank_details.get('account_number')
            elif country == 'GB':
                bank_account_data['routing_number'] = bank_details.get('sort_code', '').replace('-', '')
                bank_account_data['account_number'] = bank_details.get('account_number')
            elif bank_details.get('iban'):
                # For IBAN countries
                bank_account_data['account_number'] = bank_details.get('iban')
            else:
                # Generic account number
                bank_account_data['account_number'] = bank_details.get('account_number')
            
            # Create token
            token = self.stripe.Token.create(
                bank_account=bank_account_data
            )
            
            # Extract last 4 digits
            last4 = token.bank_account.last4 if hasattr(token, 'bank_account') else ''
            
            return {
                'success': True,
                'token_id': token.id,
                'last4': last4,
                'bank_name': token.bank_account.bank_name if hasattr(token.bank_account, 'bank_name') else bank_details.get('bank_name'),
                'fingerprint': token.bank_account.fingerprint if hasattr(token.bank_account, 'fingerprint') else None
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating bank token: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Error creating bank token: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def add_external_account(self, bank_token_id):
        """
        Add the bank account as an external account to the Stripe Connect account.
        This allows us to transfer funds to this account.
        
        Args:
            bank_token_id: The token ID from create_bank_account_token
            
        Returns:
            dict with external_account_id
        """
        try:
            # Add external account to the Express Connect account
            external_account = self.stripe.Account.create_external_account(
                self.express_account_id,
                external_account=bank_token_id
            )
            
            return {
                'success': True,
                'external_account_id': external_account.id,
                'last4': external_account.last4,
                'bank_name': external_account.bank_name,
                'currency': external_account.currency,
                'country': external_account.country
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error adding external account: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Error adding external account: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def retrieve_external_account(self, external_account_id):
        """
        Retrieve external account details from Stripe.
        
        Args:
            external_account_id: The ID of the external account
            
        Returns:
            dict with account details (only non-sensitive data)
        """
        try:
            account = self.stripe.Account.retrieve_external_account(
                self.express_account_id,
                external_account_id
            )
            
            return {
                'success': True,
                'last4': account.last4,
                'bank_name': account.bank_name,
                'currency': account.currency,
                'country': account.country,
                'status': account.status
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error retrieving external account: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_external_account(self, external_account_id):
        """
        Delete an external account from Stripe.
        
        Args:
            external_account_id: The ID of the external account to delete
            
        Returns:
            dict indicating success or failure
        """
        try:
            deleted = self.stripe.Account.delete_external_account(
                self.express_account_id,
                external_account_id
            )
            
            return {
                'success': True,
                'deleted': deleted.deleted
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error deleting external account: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_payout(self, external_account_id, amount, currency='USD', description=None):
        """
        Create a payout to an external bank account.
        
        Args:
            external_account_id: The ID of the external account
            amount: Amount in cents
            currency: Currency code
            description: Optional description
            
        Returns:
            dict with payout details
        """
        try:
            payout = self.stripe.Payout.create(
                amount=int(amount * 100),  # Convert to cents
                currency=currency.lower(),
                destination=external_account_id,
                description=description or "Platform settlement",
                stripe_account=self.express_account_id
            )
            
            return {
                'success': True,
                'payout_id': payout.id,
                'amount': payout.amount / 100,  # Convert back to dollars
                'currency': payout.currency,
                'arrival_date': payout.arrival_date,
                'status': payout.status
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payout: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def verify_bank_account(self, external_account_id, amounts=None):
        """
        Verify a bank account using micro-deposits (for US accounts).
        
        Args:
            external_account_id: The ID of the external account
            amounts: List of two amounts in cents for verification
            
        Returns:
            dict indicating verification status
        """
        try:
            if amounts:
                # Verify with provided amounts
                account = self.stripe.Account.verify_external_account(
                    self.express_account_id,
                    external_account_id,
                    amounts=amounts
                )
            else:
                # Initiate micro-deposits
                account = self.stripe.Account.create_external_account(
                    self.express_account_id,
                    external_account=external_account_id,
                    default_for_currency=True
                )
            
            return {
                'success': True,
                'status': account.status,
                'verified': account.status == 'verified'
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error verifying bank account: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }