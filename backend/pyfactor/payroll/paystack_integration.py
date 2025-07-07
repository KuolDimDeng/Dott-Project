"""
Paystack integration for mobile money payments
"""
import os
import hashlib
import hmac
import json
import logging
import requests
from django.conf import settings
from django.utils import timezone
from datetime import datetime
from decimal import Decimal

logger = logging.getLogger(__name__)

# Paystack configuration
PAYSTACK_SECRET_KEY = os.getenv('PAYSTACK_SECRET_KEY', '')
PAYSTACK_PUBLIC_KEY = os.getenv('PAYSTACK_PUBLIC_KEY', '')
PAYSTACK_BASE_URL = 'https://api.paystack.co'


class PaystackError(Exception):
    """Base exception for Paystack errors"""
    pass


class PaystackMobileMoneyService:
    """Service for handling mobile money payments via Paystack"""
    
    def __init__(self):
        self.secret_key = PAYSTACK_SECRET_KEY
        self.public_key = PAYSTACK_PUBLIC_KEY
        self.headers = {
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json'
        }
    
    def create_mobile_money_charge(self, amount, email, phone_number, currency='KES', 
                                  provider='mpesa', metadata=None):
        """
        Create a mobile money charge
        
        Args:
            amount: Amount in smallest currency unit (e.g., kobo for NGN, cents for KES)
            email: Customer email
            phone_number: Customer phone number
            currency: Currency code (KES, NGN, GHS, etc.)
            provider: Mobile money provider (mpesa, mtn, etc.)
            metadata: Additional metadata
        
        Returns:
            Charge response from Paystack
        """
        try:
            # Validate inputs
            if not all([amount, email, phone_number]):
                raise PaystackError("Amount, email, and phone number are required")
            
            # Prepare charge data
            charge_data = {
                'amount': int(amount),  # Amount in smallest unit
                'email': email,
                'currency': currency.upper(),
                'mobile_money': {
                    'phone': phone_number,
                    'provider': provider
                },
                'metadata': metadata or {}
            }
            
            # Add callback URL
            if hasattr(settings, 'PAYSTACK_CALLBACK_URL'):
                charge_data['callback_url'] = settings.PAYSTACK_CALLBACK_URL
            
            # Create charge
            response = requests.post(
                f"{PAYSTACK_BASE_URL}/charge",
                json=charge_data,
                headers=self.headers
            )
            
            response_data = response.json()
            
            if response.status_code == 200 and response_data.get('status'):
                logger.info(f"Mobile money charge created successfully: {response_data.get('data', {}).get('reference')}")
                return response_data['data']
            else:
                error_msg = response_data.get('message', 'Unknown error')
                logger.error(f"Failed to create mobile money charge: {error_msg}")
                raise PaystackError(error_msg)
                
        except requests.RequestException as e:
            logger.error(f"Request error creating mobile money charge: {str(e)}")
            raise PaystackError(f"Network error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error creating mobile money charge: {str(e)}")
            raise PaystackError(f"Unexpected error: {str(e)}")
    
    def verify_transaction(self, reference):
        """
        Verify a transaction status
        
        Args:
            reference: Transaction reference
        
        Returns:
            Transaction details
        """
        try:
            response = requests.get(
                f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}",
                headers=self.headers
            )
            
            response_data = response.json()
            
            if response.status_code == 200 and response_data.get('status'):
                return response_data['data']
            else:
                error_msg = response_data.get('message', 'Unknown error')
                logger.error(f"Failed to verify transaction {reference}: {error_msg}")
                raise PaystackError(error_msg)
                
        except requests.RequestException as e:
            logger.error(f"Request error verifying transaction: {str(e)}")
            raise PaystackError(f"Network error: {str(e)}")
    
    def create_subscription_charge(self, plan_type, billing_cycle, email, phone_number,
                                  currency='KES', provider='mpesa', metadata=None):
        """
        Create a mobile money charge for subscription
        
        Args:
            plan_type: 'professional' or 'enterprise'
            billing_cycle: 'monthly', 'six_month', or 'yearly'
            email: Customer email
            phone_number: Customer phone number
            currency: Currency code
            provider: Mobile money provider
            metadata: Additional metadata
        
        Returns:
            Charge response
        """
        # Calculate amount based on plan and cycle
        amounts = {
            'professional': {
                'monthly': {'KES': 750, 'NGN': 7500, 'GHS': 75},  # Converted to local currency
                'six_month': {'KES': 3900, 'NGN': 39000, 'GHS': 390},
                'yearly': {'KES': 7200, 'NGN': 72000, 'GHS': 720}
            },
            'enterprise': {
                'monthly': {'KES': 2250, 'NGN': 22500, 'GHS': 225},
                'six_month': {'KES': 11700, 'NGN': 117000, 'GHS': 1170},
                'yearly': {'KES': 21600, 'NGN': 216000, 'GHS': 2160}
            }
        }
        
        # Get amount for plan/cycle/currency
        amount = amounts.get(plan_type, {}).get(billing_cycle, {}).get(currency)
        
        if not amount:
            raise PaystackError(f"No pricing available for {plan_type} {billing_cycle} in {currency}")
        
        # Convert to smallest unit (multiply by 100)
        amount_in_smallest_unit = amount * 100
        
        # Add subscription metadata
        subscription_metadata = {
            'plan_type': plan_type,
            'billing_cycle': billing_cycle,
            'subscription': True,
            **(metadata or {})
        }
        
        return self.create_mobile_money_charge(
            amount=amount_in_smallest_unit,
            email=email,
            phone_number=phone_number,
            currency=currency,
            provider=provider,
            metadata=subscription_metadata
        )
    
    def verify_webhook_signature(self, payload, signature):
        """
        Verify webhook signature from Paystack
        
        Args:
            payload: Raw request body
            signature: X-Paystack-Signature header value
        
        Returns:
            Boolean indicating if signature is valid
        """
        if not self.secret_key:
            logger.error("Paystack secret key not configured")
            return False
        
        expected_signature = hmac.new(
            self.secret_key.encode('utf-8'),
            payload,
            hashlib.sha512
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)
    
    def format_phone_number(self, phone_number, country_code='KE'):
        """
        Format phone number for Paystack
        
        Args:
            phone_number: Raw phone number
            country_code: Country code
        
        Returns:
            Formatted phone number
        """
        # Remove spaces and special characters
        phone = ''.join(filter(str.isdigit, phone_number))
        
        # Country-specific formatting
        if country_code == 'KE':
            # Kenya: Ensure +254 prefix
            if phone.startswith('0'):
                phone = '254' + phone[1:]
            elif not phone.startswith('254'):
                phone = '254' + phone
            return '+' + phone
        elif country_code == 'NG':
            # Nigeria: Ensure +234 prefix
            if phone.startswith('0'):
                phone = '234' + phone[1:]
            elif not phone.startswith('234'):
                phone = '234' + phone
            return '+' + phone
        elif country_code == 'GH':
            # Ghana: Ensure +233 prefix
            if phone.startswith('0'):
                phone = '233' + phone[1:]
            elif not phone.startswith('233'):
                phone = '233' + phone
            return '+' + phone
        
        return phone_number  # Return as-is for unknown countries


# Singleton instance
paystack_service = PaystackMobileMoneyService()