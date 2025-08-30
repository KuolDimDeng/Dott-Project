"""
Paystack Payment Service for M-Pesa Integration
Leverages existing Paystack integration for mobile money payments
"""

import json
import logging
from typing import Dict, Any, Optional
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from .base_payment_service import BasePaymentService
from payroll.paystack_integration import PaystackMobileMoneyService, PaystackError

logger = logging.getLogger(__name__)


class PaystackService(BasePaymentService):
    """Paystack payment service for M-Pesa and other mobile money"""
    
    def __init__(self):
        super().__init__('PAYSTACK')
        self.paystack = PaystackMobileMoneyService()
        # Try to get from environment first, then settings
        import os
        self.secret_key = os.getenv('PAYSTACK_SECRET_KEY') or getattr(settings, 'PAYSTACK_SECRET_KEY', '')
        
    def authenticate(self) -> Dict[str, Any]:
        """Paystack uses API key authentication, no separate auth needed"""
        if not self.secret_key:
            return {
                'success': False,
                'error': 'Paystack secret key not configured'
            }
        
        return {
            'success': True,
            'message': 'Paystack authenticated via API key'
        }
    
    def request_payment(
        self,
        amount: Decimal,
        phone_number: str,
        reference: str,
        currency: str = 'KES',
        message: Optional[str] = None,
        email: Optional[str] = None,
        provider: str = 'mpesa'
    ) -> Dict[str, Any]:
        """
        Request payment via Paystack mobile money
        
        Args:
            amount: Amount in major currency units (e.g., 100 KES)
            phone_number: Customer phone number
            reference: Unique transaction reference
            currency: Currency code (KES for Kenya, GHS for Ghana, NGN for Nigeria)
            message: Payment description
            email: Customer email (required by Paystack)
            provider: Mobile money provider (mpesa, mtn, etc.)
        """
        try:
            # Paystack requires email
            if not email:
                # Generate a placeholder email from phone number
                email = f"{phone_number}@mobile.money"
            
            # Convert amount to smallest unit (cents/kobo)
            amount_in_smallest_unit = int(amount * 100)
            
            # Prepare metadata
            metadata = {
                'reference': reference,
                'message': message or 'Payment via Dott POS',
                'source': 'mobile_money_api'
            }
            
            # Create mobile money charge
            charge_response = self.paystack.create_mobile_money_charge(
                amount=amount_in_smallest_unit,
                email=email,
                phone_number=phone_number,
                currency=currency,
                provider=provider,
                metadata=metadata
            )
            
            self.log_transaction('request_payment', {
                'reference': reference,
                'amount': str(amount),
                'currency': currency,
                'status': 'initiated'
            })
            
            return {
                'success': True,
                'reference': charge_response.get('reference'),
                'status': charge_response.get('status'),
                'display_text': charge_response.get('display_text'),
                'authorization_url': charge_response.get('authorization_url'),
                'access_code': charge_response.get('access_code'),
                'message': 'Payment request sent to customer phone'
            }
            
        except PaystackError as e:
            return self.handle_error(e, {'action': 'request_payment', 'reference': reference})
        except Exception as e:
            return self.handle_error(e, {'action': 'request_payment', 'reference': reference})
    
    def check_payment_status(self, reference: str) -> Dict[str, Any]:
        """Check the status of a payment"""
        try:
            transaction = self.paystack.verify_transaction(reference)
            
            # Map Paystack status to our standard status
            paystack_status = transaction.get('status')
            our_status = self._map_status(paystack_status)
            
            return {
                'success': True,
                'status': our_status,
                'paystack_status': paystack_status,
                'amount': transaction.get('amount', 0) / 100,  # Convert from smallest unit
                'currency': transaction.get('currency'),
                'paid_at': transaction.get('paid_at'),
                'channel': transaction.get('channel'),
                'reference': transaction.get('reference'),
                'gateway_response': transaction.get('gateway_response')
            }
            
        except PaystackError as e:
            return self.handle_error(e, {'action': 'check_status', 'reference': reference})
        except Exception as e:
            return self.handle_error(e, {'action': 'check_status', 'reference': reference})
    
    def process_refund(
        self,
        original_reference: str,
        amount: Decimal,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process a refund for a payment"""
        try:
            # Convert amount to smallest unit
            amount_in_smallest_unit = int(amount * 100)
            
            # Paystack refund endpoint
            import requests
            
            refund_data = {
                'transaction': original_reference,
                'amount': amount_in_smallest_unit,
                'currency': 'KES',
                'customer_note': reason or 'Refund processed',
                'merchant_note': f'Refund for {original_reference}'
            }
            
            headers = {
                'Authorization': f'Bearer {self.secret_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                'https://api.paystack.co/refund',
                json=refund_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                response_data = response.json()
                if response_data.get('status'):
                    return {
                        'success': True,
                        'refund_id': response_data['data'].get('id'),
                        'status': 'processed',
                        'message': 'Refund initiated successfully'
                    }
            
            return {
                'success': False,
                'error': 'Refund failed',
                'details': response.text
            }
            
        except Exception as e:
            return self.handle_error(e, {'action': 'refund', 'reference': original_reference})
    
    def verify_webhook(self, headers: Dict, payload: str, signature: str) -> bool:
        """Verify webhook signature from Paystack"""
        import hmac
        import hashlib
        
        # Paystack sends signature in X-Paystack-Signature header
        paystack_signature = headers.get('X-Paystack-Signature', '')
        
        # Calculate expected signature
        expected_signature = hmac.new(
            self.secret_key.encode('utf-8'),
            payload.encode('utf-8') if isinstance(payload, str) else payload,
            hashlib.sha512
        ).hexdigest()
        
        return paystack_signature == expected_signature
    
    def _map_status(self, paystack_status: str) -> str:
        """Map Paystack status to our standard status"""
        status_map = {
            'success': 'SUCCESSFUL',
            'failed': 'FAILED',
            'abandoned': 'CANCELLED',
            'pending': 'PENDING',
            'ongoing': 'PROCESSING'
        }
        return status_map.get(paystack_status, 'PENDING')
    
    def get_supported_countries(self) -> list:
        """Get list of countries supported by Paystack"""
        return [
            {'code': 'KE', 'name': 'Kenya', 'currency': 'KES', 'provider': 'mpesa'},
            {'code': 'NG', 'name': 'Nigeria', 'currency': 'NGN', 'provider': 'bank'},
            {'code': 'GH', 'name': 'Ghana', 'currency': 'GHS', 'provider': 'mtn'},
            {'code': 'ZA', 'name': 'South Africa', 'currency': 'ZAR', 'provider': 'bank'},
        ]
    
    def validate_phone_for_country(self, phone_number: str, country_code: str) -> Dict[str, Any]:
        """Validate phone number for specific country"""
        country_patterns = {
            'KE': r'^(?:\+254|0)?[17]\d{8}$',  # Kenya M-Pesa
            'NG': r'^(?:\+234|0)?[789]\d{9}$',  # Nigeria
            'GH': r'^(?:\+233|0)?[235]\d{8}$',  # Ghana MTN
            'ZA': r'^(?:\+27|0)?[678]\d{8}$',   # South Africa
        }
        
        import re
        pattern = country_patterns.get(country_code)
        
        if not pattern:
            return {
                'success': False,
                'error': f'Country {country_code} not supported by Paystack'
            }
        
        if re.match(pattern, phone_number):
            return {
                'success': True,
                'formatted_number': self._format_phone_number(phone_number, country_code)
            }
        
        return {
            'success': False,
            'error': f'Invalid phone number format for {country_code}'
        }
    
    def _format_phone_number(self, phone_number: str, country_code: str) -> str:
        """Format phone number for Paystack API"""
        # Remove spaces and special characters
        phone = ''.join(filter(str.isdigit, phone_number))
        
        # Add country code if missing
        country_codes = {
            'KE': '254',
            'NG': '234',
            'GH': '233',
            'ZA': '27'
        }
        
        code = country_codes.get(country_code, '')
        if code and not phone.startswith(code):
            # Remove leading 0 if present
            if phone.startswith('0'):
                phone = phone[1:]
            phone = code + phone
        
        return '+' + phone