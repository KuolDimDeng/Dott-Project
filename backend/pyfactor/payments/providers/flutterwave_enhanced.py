# payments/providers/flutterwave_enhanced.py
import requests
import hashlib
import json
from decimal import Decimal
from typing import Dict, Any
from django.conf import settings
from .base import PaymentProcessor, PaymentProcessorResult

class FlutterwaveProcessor(PaymentProcessor):
    """Enhanced Flutterwave payment processor with comprehensive functionality"""
    
    def __init__(self, gateway_config: Dict[str, Any]):
        super().__init__(gateway_config)
        
        # Flutterwave specific configuration
        self.public_key = gateway_config.get('public_key') or getattr(settings, 'FLUTTERWAVE_PUBLIC_KEY', '')
        self.secret_key = self.secret_key or getattr(settings, 'FLUTTERWAVE_SECRET_KEY', '')
        self.encryption_key = gateway_config.get('encryption_key') or getattr(settings, 'FLUTTERWAVE_ENCRYPTION_KEY', '')
        
        # API URLs
        if self.is_sandbox:
            self.base_url = "https://api.flutterwave.com/v3"
        else:
            self.base_url = "https://api.flutterwave.com/v3"
        
        self.log_debug("Flutterwave processor initialized", {
            'sandbox': self.is_sandbox,
            'has_public_key': bool(self.public_key)
        })
    
    def get_headers(self) -> Dict[str, str]:
        """Get standard headers for Flutterwave API"""
        return {
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json'
        }
    
    def process_payment(self, transaction, payment_method=None) -> PaymentProcessorResult:
        """Process a payment using Flutterwave"""
        self.log_debug("Processing Flutterwave payment", {
            'transaction_id': str(transaction.id),
            'amount': str(transaction.amount),
            'currency': transaction.currency
        })
        
        try:
            # Prepare payment data
            payment_data = {
                "tx_ref": transaction.reference_number,
                "amount": str(transaction.amount),
                "currency": transaction.currency.upper(),
                "redirect_url": self.config.get('redirect_url', ''),
                "payment_options": "card,banktransfer,ussd,mobilemoney",
                "customer": {
                    "email": getattr(transaction.user, 'email', ''),
                    "phone_number": getattr(transaction, 'recipient_phone', ''),
                    "name": getattr(transaction, 'recipient_name', '') or f"{transaction.user.first_name} {transaction.user.last_name}".strip()
                },
                "customizations": {
                    "title": "Payment",
                    "description": transaction.description[:100] if transaction.description else f"Payment {transaction.reference_number}",
                    "logo": self.config.get('logo_url', '')
                },
                "meta": {
                    "transaction_id": str(transaction.id),
                    "user_id": str(transaction.user.id),
                    "tenant_id": str(transaction.tenant_id) if transaction.tenant_id else '',
                    **transaction.metadata
                }
            }
            
            # Create payment
            response = requests.post(
                f"{self.base_url}/payments",
                json=payment_data,
                headers=self.get_headers()
            )
            
            response_data = response.json()
            
            self.log_debug("Payment creation response", {
                'status': response_data.get('status'),
                'payment_id': response_data.get('data', {}).get('id')
            })
            
            if response_data.get('status') == 'success':
                payment_info = response_data.get('data', {})
                return self.create_success_result(
                    transaction_id=str(payment_info.get('id')),
                    gateway_response=response_data,
                    requires_action=True,
                    action_data={
                        'payment_link': payment_info.get('link'),
                        'payment_id': payment_info.get('id')
                    }
                )
            else:
                return self.create_error_result(
                    response_data.get('message', 'Payment creation failed'),
                    code='payment_creation_failed',
                    gateway_response=response_data
                )
                
        except requests.RequestException as e:
            self.log_error("HTTP error during Flutterwave payment", e)
            return self.create_error_result(
                "Network error while processing Flutterwave payment",
                code='network_error'
            )
        except Exception as e:
            self.log_error("Unexpected error processing Flutterwave payment", e)
            return self.create_error_result(
                "An unexpected error occurred while processing the Flutterwave payment",
                code='internal_error'
            )
    
    def process_payout(self, transaction, payment_method) -> PaymentProcessorResult:
        """Process a payout using Flutterwave Transfer"""
        self.log_debug("Processing Flutterwave payout", {
            'transaction_id': str(transaction.id),
            'amount': str(transaction.amount),
            'recipient': transaction.recipient_name
        })
        
        try:
            # Determine account details based on payment method type
            account_bank = None
            account_number = None
            
            if payment_method.method_type == 'bank_account':
                # Get bank details from encrypted data
                payment_data = payment_method.decrypt_sensitive_data()
                account_bank = payment_data.get('bank_code')
                account_number = payment_data.get('account_number')
            elif payment_method.method_type == 'mobile_money':
                # Mobile money details
                payment_data = payment_method.decrypt_sensitive_data()
                account_number = payment_data.get('phone_number', payment_method.phone_number)
                
                # Map mobile money providers to Flutterwave codes
                provider_map = {
                    'mtn_gh': 'MTN',
                    'vodafone_gh': 'VODAFONE',
                    'airteltigo_gh': 'AIRTELTIGO',
                    'mtn_ug': 'MTN_UG',
                    'airtel_ug': 'AIRTEL_UG',
                    'mtn_cm': 'MTN_CM',
                    'orange_cm': 'ORANGE_CM'
                }
                account_bank = provider_map.get(payment_method.mobile_provider, 'MTN')
            
            if not account_bank or not account_number:
                return self.create_error_result(
                    "Missing account details for payout",
                    code='missing_account_details'
                )
            
            # Prepare transfer data
            transfer_data = {
                "account_bank": account_bank,
                "account_number": account_number,
                "amount": int(transaction.amount),
                "currency": transaction.currency.upper(),
                "narration": transaction.description[:100] if transaction.description else f"Payout {transaction.reference_number}",
                "reference": transaction.reference_number,
                "callback_url": self.callback_url,
                "debit_currency": transaction.currency.upper(),
                "beneficiary_name": transaction.recipient_name
            }
            
            # Create transfer
            response = requests.post(
                f"{self.base_url}/transfers",
                json=transfer_data,
                headers=self.get_headers()
            )
            
            response_data = response.json()
            
            self.log_debug("Transfer response", {
                'status': response_data.get('status'),
                'transfer_id': response_data.get('data', {}).get('id')
            })
            
            if response_data.get('status') == 'success':
                transfer_info = response_data.get('data', {})
                return self.create_success_result(
                    transaction_id=str(transfer_info.get('id')),
                    gateway_response=response_data
                )
            else:
                return self.create_error_result(
                    response_data.get('message', 'Transfer failed'),
                    code='transfer_failed',
                    gateway_response=response_data
                )
                
        except Exception as e:
            self.log_error("Error processing Flutterwave payout", e)
            return self.create_error_result(
                "An unexpected error occurred while processing the Flutterwave payout",
                code='internal_error'
            )
    
    def process_refund(self, original_transaction, refund_amount: Decimal, 
                      reason: str = None) -> PaymentProcessorResult:
        """Process a refund using Flutterwave"""
        self.log_debug("Processing Flutterwave refund", {
            'original_transaction_id': str(original_transaction.id),
            'refund_amount': str(refund_amount),
            'reason': reason
        })
        
        try:
            gateway_transaction_id = original_transaction.gateway_transaction_id
            if not gateway_transaction_id:
                return self.create_error_result(
                    "No gateway transaction ID found for original transaction",
                    code='no_gateway_transaction_id'
                )
            
            # Prepare refund data
            refund_data = {
                "amount": str(refund_amount),
                "comments": reason or "Customer requested refund"
            }
            
            # Create refund
            response = requests.post(
                f"{self.base_url}/transactions/{gateway_transaction_id}/refund",
                json=refund_data,
                headers=self.get_headers()
            )
            
            response_data = response.json()
            
            self.log_debug("Refund response", {
                'status': response_data.get('status'),
                'refund_id': response_data.get('data', {}).get('id')
            })
            
            if response_data.get('status') == 'success':
                return self.create_success_result(
                    transaction_id=str(response_data.get('data', {}).get('id', gateway_transaction_id)),
                    gateway_response=response_data
                )
            else:
                return self.create_error_result(
                    response_data.get('message', 'Refund failed'),
                    code='refund_failed',
                    gateway_response=response_data
                )
                
        except Exception as e:
            self.log_error("Error processing Flutterwave refund", e)
            return self.create_error_result(
                "An unexpected error occurred while processing the refund",
                code='internal_error'
            )
    
    def add_payment_method(self, user, method_data: Dict) -> PaymentProcessorResult:
        """Add a payment method (validate and store details)"""
        self.log_debug("Adding Flutterwave payment method", {
            'user_id': str(user.id),
            'method_type': method_data.get('type')
        })
        
        try:
            method_type = method_data.get('type')
            
            if method_type == 'bank_account':
                # Validate bank account
                account_number = method_data.get('account_number')
                bank_code = method_data.get('bank_code')
                
                if not account_number or not bank_code:
                    return self.create_error_result(
                        "Account number and bank code are required",
                        code='missing_account_details'
                    )
                
                # Resolve account name using Flutterwave API
                resolve_data = {
                    "account_number": account_number,
                    "account_bank": bank_code
                }
                
                response = requests.post(
                    f"{self.base_url}/accounts/resolve",
                    json=resolve_data,
                    headers=self.get_headers()
                )
                
                response_data = response.json()
                
                if response_data.get('status') == 'success':
                    account_info = response_data.get('data', {})
                    return self.create_success_result(
                        transaction_id=f"{bank_code}_{account_number}",
                        gateway_response={
                            'account_name': account_info.get('account_name'),
                            'account_number': account_number,
                            'bank_code': bank_code,
                            'bank_name': account_info.get('bank_name')
                        }
                    )
                else:
                    return self.create_error_result(
                        response_data.get('message', 'Account verification failed'),
                        code='account_verification_failed'
                    )
            
            elif method_type == 'mobile_money':
                phone_number = method_data.get('phone_number')
                provider = method_data.get('provider')
                
                if not phone_number or not provider:
                    return self.create_error_result(
                        "Phone number and provider are required for mobile money",
                        code='missing_mobile_details'
                    )
                
                return self.create_success_result(
                    transaction_id=f"{provider}_{phone_number}",
                    gateway_response={
                        'phone_number': phone_number,
                        'provider': provider,
                        'validated': True
                    }
                )
            
            else:
                return self.create_error_result(
                    f"Unsupported payment method type: {method_type}",
                    code='unsupported_method_type'
                )
                
        except Exception as e:
            self.log_error("Error adding Flutterwave payment method", e)
            return self.create_error_result(
                "An unexpected error occurred while adding the payment method",
                code='internal_error'
            )
    
    def verify_payment_method(self, payment_method, verification_data: Dict) -> PaymentProcessorResult:
        """Verify payment method (already done during add_payment_method)"""
        return self.create_success_result(
            transaction_id=payment_method.id,
            gateway_response={'verified': True}
        )
    
    def remove_payment_method(self, payment_method) -> PaymentProcessorResult:
        """Remove payment method (no API call needed)"""
        return self.create_success_result(
            transaction_id=payment_method.id,
            gateway_response={'removed': True}
        )
    
    def verify_webhook_signature(self, payload: str, signature: str, headers: Dict) -> bool:
        """Verify Flutterwave webhook signature"""
        try:
            # Flutterwave uses verif-hash header for webhook verification
            secret_hash = headers.get('verif-hash')
            if not secret_hash:
                return False
            
            # Compute expected hash
            expected_hash = hashlib.sha256(self.secret_key.encode()).hexdigest()
            
            return secret_hash == expected_hash
        except Exception as e:
            self.log_error("Webhook signature verification failed", e)
            return False
    
    def process_webhook(self, event_type: str, payload: Dict) -> PaymentProcessorResult:
        """Process Flutterwave webhook"""
        self.log_debug("Processing Flutterwave webhook", {
            'event_type': event_type,
            'txRef': payload.get('txRef')
        })
        
        try:
            # Flutterwave webhook format
            status = payload.get('status')
            tx_ref = payload.get('txRef')
            
            if status == 'successful':
                return self._handle_successful_payment(payload)
            elif status == 'failed':
                return self._handle_failed_payment(payload)
            else:
                self.log_debug(f"Unhandled webhook status: {status}")
                return self.create_success_result(
                    transaction_id=tx_ref or '',
                    gateway_response={'message': 'Webhook acknowledged but not processed'}
                )
        
        except Exception as e:
            self.log_error("Error processing Flutterwave webhook", e)
            return self.create_error_result(
                "Failed to process webhook event",
                code='webhook_processing_error'
            )
    
    def _handle_successful_payment(self, payload: Dict) -> PaymentProcessorResult:
        """Handle successful payment webhook"""
        tx_ref = payload.get('txRef')
        
        # Find transaction by reference number
        if tx_ref:
            try:
                from ..models import Transaction
                transaction = Transaction.objects.get(reference_number=tx_ref)
                transaction.mark_as_completed(
                    gateway_transaction_id=str(payload.get('id')),
                    gateway_response=payload
                )
            except Transaction.DoesNotExist:
                self.log_error(f"Transaction with reference {tx_ref} not found for webhook")
        
        return self.create_success_result(
            transaction_id=str(payload.get('id')),
            gateway_response=payload
        )
    
    def _handle_failed_payment(self, payload: Dict) -> PaymentProcessorResult:
        """Handle failed payment webhook"""
        tx_ref = payload.get('txRef')
        
        # Find transaction by reference number
        if tx_ref:
            try:
                from ..models import Transaction
                transaction = Transaction.objects.get(reference_number=tx_ref)
                transaction.mark_as_failed(
                    error_message=payload.get('message', 'Payment failed'),
                    error_code=payload.get('code')
                )
            except Transaction.DoesNotExist:
                self.log_error(f"Transaction with reference {tx_ref} not found for webhook")
        
        return self.create_success_result(
            transaction_id=str(payload.get('id')),
            gateway_response=payload
        )
    
    def get_transaction_status(self, gateway_transaction_id: str) -> PaymentProcessorResult:
        """Get transaction status from Flutterwave"""
        try:
            response = requests.get(
                f"{self.base_url}/transactions/{gateway_transaction_id}/verify",
                headers=self.get_headers()
            )
            
            response_data = response.json()
            
            return self.create_success_result(
                transaction_id=gateway_transaction_id,
                gateway_response=response_data
            )
            
        except Exception as e:
            self.log_error("Error getting Flutterwave transaction status", e)
            return self.create_error_result(
                "Failed to get transaction status",
                code='status_query_failed'
            )
    
    def get_supported_currencies(self) -> list:
        """Get supported currencies for Flutterwave"""
        return [
            'NGN', 'USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS', 'GHS', 'ZAR',
            'XAF', 'XOF', 'EGP', 'MAD', 'ZMW', 'RWF', 'SLL', 'MWK'
        ]
    
    def get_supported_countries(self) -> list:
        """Get supported countries for Flutterwave"""
        return [
            'NG', 'KE', 'UG', 'TZ', 'ZA', 'GH', 'RW', 'SL', 'MW', 'ZM',
            'CM', 'SN', 'CI', 'BF', 'ML', 'NE', 'TD', 'CF', 'CG', 'GA',
            'GQ', 'ST', 'EG', 'MA', 'US', 'GB', 'CA', 'AU'
        ]
    
    def validate_credentials(self) -> bool:
        """Validate Flutterwave API credentials"""
        try:
            response = requests.get(
                f"{self.base_url}/banks/NG",  # Simple endpoint to test auth
                headers=self.get_headers()
            )
            return response.status_code == 200
        except Exception:
            return False
    
    def calculate_fees(self, amount: Decimal, currency: str = 'USD') -> Dict[str, Decimal]:
        """Calculate Flutterwave processing fees"""
        # Flutterwave fees vary by region and payment method
        # These are approximate rates - check current Flutterwave pricing
        
        if currency.upper() == 'NGN':
            if amount <= 2500:
                percentage_fee = Decimal('0.014')  # 1.4%
                fixed_fee = Decimal('0')
            else:
                percentage_fee = Decimal('0.014')  # 1.4%
                fixed_fee = Decimal('100')  # NGN 100
        elif currency.upper() in ['USD', 'EUR', 'GBP']:
            percentage_fee = Decimal('0.039')  # 3.9%
            fixed_fee = Decimal('0')
        else:
            # Local African currencies
            percentage_fee = Decimal('0.025')  # 2.5%
            fixed_fee = Decimal('0')
        
        fee_amount = (amount * percentage_fee) + fixed_fee
        
        return {
            'percentage_fee': amount * percentage_fee,
            'fixed_fee': fixed_fee,
            'total_fee': fee_amount,
            'net_amount': amount - fee_amount
        }
    
    # Legacy methods for backward compatibility
    def get_employee_account_form(self):
        """Return form fields needed for Flutterwave"""
        return [
            {'name': 'method_type', 'type': 'select', 'required': True, 'label': 'Payment Method Type',
             'options': [
                 {'value': 'bank_account', 'label': 'Bank Account'},
                 {'value': 'mobile_money', 'label': 'Mobile Money'}
             ]},
            {'name': 'account_number', 'type': 'text', 'required': False, 'label': 'Account Number (for bank)'},
            {'name': 'bank_code', 'type': 'text', 'required': False, 'label': 'Bank Code (for bank)'},
            {'name': 'phone_number', 'type': 'tel', 'required': False, 'label': 'Phone Number (for mobile money)'},
            {'name': 'provider', 'type': 'select', 'required': False, 'label': 'Mobile Money Provider',
             'options': [
                 {'value': 'mtn_gh', 'label': 'MTN Ghana'},
                 {'value': 'vodafone_gh', 'label': 'Vodafone Ghana'},
                 {'value': 'airteltigo_gh', 'label': 'AirtelTigo Ghana'},
                 {'value': 'mtn_ug', 'label': 'MTN Uganda'},
                 {'value': 'airtel_ug', 'label': 'Airtel Uganda'}
             ]}
        ]
    
    def validate_account_details(self, details):
        """Validate Flutterwave account details"""
        method_type = details.get('method_type')
        
        if method_type == 'bank_account':
            if not details.get('account_number') or not details.get('bank_code'):
                return False, "Account number and bank code are required for bank accounts"
        elif method_type == 'mobile_money':
            if not details.get('phone_number') or not details.get('provider'):
                return False, "Phone number and provider are required for mobile money"
        else:
            return False, "Invalid payment method type"
        
        return True, "Account details are valid"

# Backward compatibility alias
Provider = FlutterwaveProcessor