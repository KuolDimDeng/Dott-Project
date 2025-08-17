"""
Wise API Service for handling bank transfers and quotes.
"""
import requests
import json
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class WiseService:
    """
    Service class for interacting with Wise API.
    Handles transfers, quotes, and recipient management.
    """
    
    def __init__(self):
        self.api_token = settings.WISE_API_TOKEN
        self.profile_id = settings.WISE_PROFILE_ID
        self.base_url = getattr(settings, 'WISE_BASE_URL', "https://api.wise.com")
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        # Log initialization for debugging
        logger.info(f"WiseService initialized with base_url: {self.base_url}")
        
    def create_quote(self, source_currency, target_currency, amount, transfer_type="BALANCE"):
        """
        Create a quote for currency conversion and transfer fees.
        
        Args:
            source_currency: Currency code (e.g., 'USD')
            target_currency: Target currency code (e.g., 'EUR')
            amount: Amount to transfer
            transfer_type: Type of transfer (BALANCE or BANK_TRANSFER)
            
        Returns:
            dict: Quote details including fees and exchange rate
        """
        try:
            url = f"{self.base_url}/v3/profiles/{self.profile_id}/quotes"
            
            payload = {
                "sourceCurrency": source_currency,
                "targetCurrency": target_currency,
                "sourceAmount": float(amount),
                "payOut": transfer_type
            }
            
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            quote_data = response.json()
            
            # Extract relevant fee information
            return {
                "id": quote_data.get("id"),
                "source_amount": quote_data.get("sourceAmount"),
                "target_amount": quote_data.get("targetAmount"),
                "exchange_rate": quote_data.get("rate"),
                "fee": quote_data.get("fee", {}).get("total"),
                "fee_currency": quote_data.get("fee", {}).get("currency"),
                "delivery_estimate": quote_data.get("deliveryEstimate"),
                "created_at": quote_data.get("createdAt"),
                "expires_at": quote_data.get("expiresAt")
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error creating Wise quote: {str(e)}")
            raise Exception(f"Failed to create quote: {str(e)}")
    
    def create_recipient(self, wise_item):
        """
        Create a recipient in Wise for transfers.
        
        Args:
            wise_item: WiseItem model instance with bank details
            
        Returns:
            str: Recipient ID from Wise
        """
        try:
            url = f"{self.base_url}/v1/accounts"
            
            # Build recipient details based on country
            details = self._build_recipient_details(wise_item)
            
            payload = {
                "profile": self.profile_id,
                "accountHolderName": wise_item.account_holder_name,
                "currency": wise_item.currency,
                "type": details["type"],
                "details": details["details"]
            }
            
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            recipient_data = response.json()
            recipient_id = recipient_data.get("id")
            
            # Save recipient ID to WiseItem
            wise_item.wise_recipient_id = str(recipient_id)
            wise_item.save()
            
            return recipient_id
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error creating Wise recipient: {str(e)}")
            raise Exception(f"Failed to create recipient: {str(e)}")
    
    def _build_recipient_details(self, wise_item):
        """
        Build recipient details based on country-specific requirements.
        """
        country = wise_item.bank_country.upper()
        
        # US bank accounts
        if country == "US":
            return {
                "type": "aba",
                "details": {
                    "legalType": "PRIVATE",
                    "abartn": wise_item.routing_number,
                    "accountNumber": wise_item.account_number,
                    "accountType": "CHECKING",
                    "address": {
                        "country": country,
                        "city": "New York",  # This should come from user profile
                        "postCode": "10001",
                        "firstLine": "123 Main St"
                    }
                }
            }
        
        # European IBAN accounts
        elif wise_item.iban:
            return {
                "type": "iban",
                "details": {
                    "legalType": "PRIVATE",
                    "iban": wise_item.iban
                }
            }
        
        # UK sort code accounts
        elif country == "GB" and wise_item.sort_code:
            return {
                "type": "sort_code",
                "details": {
                    "legalType": "PRIVATE",
                    "sortCode": wise_item.sort_code.replace("-", ""),
                    "accountNumber": wise_item.account_number
                }
            }
        
        # India IFSC accounts
        elif country == "IN" and wise_item.ifsc_code:
            return {
                "type": "indian",
                "details": {
                    "legalType": "PRIVATE",
                    "ifscCode": wise_item.ifsc_code,
                    "accountNumber": wise_item.account_number
                }
            }
        
        # Default SWIFT for international
        else:
            return {
                "type": "swift_code",
                "details": {
                    "legalType": "PRIVATE",
                    "swiftCode": wise_item.swift_code,
                    "accountNumber": wise_item.account_number or wise_item.iban
                }
            }
    
    def create_transfer(self, quote_id, recipient_id, reference=""):
        """
        Create a transfer using a quote and recipient.
        
        Args:
            quote_id: ID of the quote
            recipient_id: ID of the recipient
            reference: Transfer reference message
            
        Returns:
            dict: Transfer details including ID and status
        """
        try:
            url = f"{self.base_url}/v1/transfers"
            
            payload = {
                "targetAccount": recipient_id,
                "quoteUuid": quote_id,
                "customerTransactionId": str(uuid.uuid4()),
                "details": {
                    "reference": reference or "Platform payment settlement"
                }
            }
            
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            transfer_data = response.json()
            
            return {
                "id": transfer_data.get("id"),
                "status": transfer_data.get("status"),
                "created_at": transfer_data.get("created"),
                "source_amount": transfer_data.get("sourceAmount"),
                "target_amount": transfer_data.get("targetAmount"),
                "rate": transfer_data.get("rate"),
                "reference": transfer_data.get("reference")
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error creating Wise transfer: {str(e)}")
            raise Exception(f"Failed to create transfer: {str(e)}")
    
    def fund_transfer(self, transfer_id):
        """
        Fund a transfer (mark it as paid).
        
        Args:
            transfer_id: ID of the transfer to fund
            
        Returns:
            dict: Updated transfer status
        """
        try:
            url = f"{self.base_url}/v3/profiles/{self.profile_id}/transfers/{transfer_id}/payments"
            
            payload = {
                "type": "BALANCE"  # Using Wise balance to fund
            }
            
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error funding Wise transfer: {str(e)}")
            raise Exception(f"Failed to fund transfer: {str(e)}")
    
    def get_transfer_status(self, transfer_id):
        """
        Get the current status of a transfer.
        
        Args:
            transfer_id: ID of the transfer
            
        Returns:
            dict: Transfer status and details
        """
        try:
            url = f"{self.base_url}/v1/transfers/{transfer_id}"
            
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            transfer_data = response.json()
            
            return {
                "id": transfer_data.get("id"),
                "status": transfer_data.get("status"),
                "created_at": transfer_data.get("created"),
                "completed_at": transfer_data.get("completedAt"),
                "source_amount": transfer_data.get("sourceAmount"),
                "target_amount": transfer_data.get("targetAmount"),
                "rate": transfer_data.get("rate")
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting Wise transfer status: {str(e)}")
            raise Exception(f"Failed to get transfer status: {str(e)}")
    
    def validate_bank_details(self, wise_item):
        """
        Validate bank account details with Wise.
        
        Args:
            wise_item: WiseItem model instance
            
        Returns:
            bool: True if valid, False otherwise
        """
        try:
            # Try to create a recipient as validation
            recipient_id = self.create_recipient(wise_item)
            
            if recipient_id:
                wise_item.is_verified = True
                wise_item.verification_date = timezone.now()
                wise_item.save()
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"Bank details validation failed: {str(e)}")
            return False


class WiseSettlementService:
    """
    Service for handling payment settlements through Wise.
    """
    
    def __init__(self):
        self.wise_service = WiseService()
        
    def process_settlement(self, settlement):
        """
        Process a payment settlement through Wise.
        
        Args:
            settlement: PaymentSettlement model instance
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Get user's default POS bank account
            from banking.models import WiseItem
            wise_item = WiseItem.get_default_pos_account(settlement.user)
            
            if not wise_item:
                raise Exception("No default POS bank account found for user")
            
            # Create or get recipient
            if not wise_item.wise_recipient_id:
                recipient_id = self.wise_service.create_recipient(wise_item)
            else:
                recipient_id = wise_item.wise_recipient_id
            
            # Create quote for transfer
            quote = self.wise_service.create_quote(
                source_currency=settlement.currency,
                target_currency=wise_item.currency,
                amount=settlement.settlement_amount
            )
            
            # Update settlement with fee estimate
            settlement.wise_fee_estimate = Decimal(str(quote["fee"]))
            settlement.wise_recipient_id = recipient_id
            settlement.status = "processing"
            settlement.processed_at = timezone.now()
            settlement.save()
            
            # Create transfer
            transfer = self.wise_service.create_transfer(
                quote_id=quote["id"],
                recipient_id=recipient_id,
                reference=f"Payment settlement {settlement.id}"
            )
            
            # Fund the transfer
            self.wise_service.fund_transfer(transfer["id"])
            
            # Update settlement
            settlement.mark_completed(
                wise_transfer_id=transfer["id"],
                actual_wise_fee=Decimal(str(quote["fee"]))
            )
            
            # Update Wise item last transfer date
            wise_item.last_transfer_date = timezone.now()
            wise_item.save()
            
            # Send confirmation email
            self._send_settlement_confirmation(settlement)
            
            return True
            
        except Exception as e:
            logger.error(f"Settlement processing failed: {str(e)}")
            settlement.status = "failed"
            settlement.failed_at = timezone.now()
            settlement.failure_reason = str(e)
            settlement.save()
            return False
    
    def _send_settlement_confirmation(self, settlement):
        """
        Send email confirmation of successful settlement.
        """
        # This would integrate with your email service
        # For now, just log it
        logger.info(f"Settlement {settlement.id} completed successfully. User receives: {settlement.user_receives}")


import uuid