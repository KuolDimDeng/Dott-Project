# payments/providers/bank_transfer.py
import uuid
import json
from decimal import Decimal
from typing import Dict, Any
from datetime import datetime, timedelta
from django.conf import settings
from .base import PaymentProcessor, PaymentProcessorResult

class BankTransferProcessor(PaymentProcessor):
    """Bank Transfer processor for ACH and Wire transfers"""
    
    def __init__(self, gateway_config: Dict[str, Any]):
        super().__init__(gateway_config)
        
        # Bank transfer specific configuration
        self.bank_name = gateway_config.get('bank_name', 'Primary Bank')
        self.routing_number = gateway_config.get('routing_number')
        self.account_number = gateway_config.get('account_number')
        self.swift_code = gateway_config.get('swift_code')  # For international wires
        
        # Processing settings
        self.ach_processing_days = gateway_config.get('ach_processing_days', 3)
        self.wire_processing_hours = gateway_config.get('wire_processing_hours', 4)
        
        self.log_debug("Bank Transfer processor initialized", {
            'bank_name': self.bank_name,
            'supports_ach': bool(self.routing_number),
            'supports_wire': bool(self.swift_code)
        })
    
    def process_payment(self, transaction, payment_method=None) -> PaymentProcessorResult:
        """Process a payment via bank transfer (typically ACH debit)"""
        self.log_debug("Processing bank transfer payment", {
            'transaction_id': str(transaction.id),
            'amount': str(transaction.amount),
            'currency': transaction.currency
        })
        
        try:
            # Validate currency (bank transfers typically only support domestic currency)
            if transaction.currency.upper() not in ['USD', 'EUR', 'GBP', 'CAD', 'AUD']:
                return self.create_error_result(
                    f"Bank transfers not supported for currency: {transaction.currency}",
                    code='unsupported_currency'
                )
            
            # Get bank details from payment method
            if not payment_method or payment_method.method_type != 'bank_account':
                return self.create_error_result(
                    "Bank account payment method required for bank transfers",
                    code='invalid_payment_method'
                )
            
            # Decrypt sensitive bank data
            bank_data = payment_method.decrypt_sensitive_data()
            if not bank_data.get('account_number') or not bank_data.get('routing_number'):
                return self.create_error_result(
                    "Complete bank account details required",
                    code='incomplete_bank_details'
                )
            
            # Generate internal transaction ID
            internal_tx_id = f"ACH_{datetime.now().strftime('%Y%m%d')}_{str(uuid.uuid4())[:8].upper()}"
            
            # Simulate ACH processing time
            estimated_completion = datetime.now() + timedelta(days=self.ach_processing_days)
            
            # Create processing record
            processing_record = {
                'type': 'ach_debit',
                'amount': str(transaction.amount),
                'currency': transaction.currency,
                'source_account': {
                    'account_number': bank_data['account_number'][-4:],  # Only last 4 digits
                    'routing_number': bank_data['routing_number'][-4:],
                    'bank_name': bank_data.get('bank_name', 'Unknown Bank')
                },
                'destination_account': {
                    'account_number': self.account_number[-4:] if self.account_number else 'XXXX',
                    'routing_number': self.routing_number[-4:] if self.routing_number else 'XXXX',
                    'bank_name': self.bank_name
                },
                'status': 'pending',
                'estimated_completion': estimated_completion.isoformat(),
                'processing_fee': self.calculate_fees(transaction.amount, transaction.currency)['total_fee']
            }
            
            self.log_debug("ACH transfer initiated", {
                'internal_tx_id': internal_tx_id,
                'estimated_completion': estimated_completion.isoformat()
            })
            
            return self.create_success_result(
                transaction_id=internal_tx_id,
                gateway_response=processing_record,
                requires_action=False
            )
            
        except Exception as e:
            self.log_error("Error processing bank transfer payment", e)
            return self.create_error_result(
                "An unexpected error occurred while processing the bank transfer",
                code='internal_error'
            )
    
    def process_payout(self, transaction, payment_method) -> PaymentProcessorResult:
        """Process a payout via bank transfer (ACH credit or wire)"""
        self.log_debug("Processing bank transfer payout", {
            'transaction_id': str(transaction.id),
            'amount': str(transaction.amount),
            'recipient': transaction.recipient_name
        })
        
        try:
            # Validate currency
            if transaction.currency.upper() not in ['USD', 'EUR', 'GBP', 'CAD', 'AUD']:
                return self.create_error_result(
                    f"Bank transfers not supported for currency: {transaction.currency}",
                    code='unsupported_currency'
                )
            
            # Get recipient bank details
            if payment_method.method_type != 'bank_account':
                return self.create_error_result(
                    "Bank account payment method required for bank transfers",
                    code='invalid_payment_method'
                )
            
            bank_data = payment_method.decrypt_sensitive_data()
            if not bank_data.get('account_number') or not bank_data.get('routing_number'):
                return self.create_error_result(
                    "Complete recipient bank account details required",
                    code='incomplete_bank_details'
                )
            
            # Determine transfer type based on amount and urgency
            is_wire = (
                transaction.amount > 10000 or  # Large amounts
                transaction.priority in ['high', 'urgent'] or  # Urgent priority
                bank_data.get('international', False)  # International transfer
            )
            
            if is_wire:
                # Wire transfer
                internal_tx_id = f"WIRE_{datetime.now().strftime('%Y%m%d')}_{str(uuid.uuid4())[:8].upper()}"
                estimated_completion = datetime.now() + timedelta(hours=self.wire_processing_hours)
                transfer_type = 'wire_transfer'
                fee_multiplier = 3  # Wire transfers are more expensive
            else:
                # ACH transfer
                internal_tx_id = f"ACH_{datetime.now().strftime('%Y%m%d')}_{str(uuid.uuid4())[:8].upper()}"
                estimated_completion = datetime.now() + timedelta(days=self.ach_processing_days)
                transfer_type = 'ach_credit'
                fee_multiplier = 1
            
            # Create processing record
            processing_record = {
                'type': transfer_type,
                'amount': str(transaction.amount),
                'currency': transaction.currency,
                'recipient': {
                    'name': transaction.recipient_name,
                    'account_number': bank_data['account_number'][-4:],  # Only last 4 digits
                    'routing_number': bank_data['routing_number'][-4:],
                    'bank_name': bank_data.get('bank_name', 'Unknown Bank')
                },
                'sender': {
                    'account_number': self.account_number[-4:] if self.account_number else 'XXXX',
                    'routing_number': self.routing_number[-4:] if self.routing_number else 'XXXX',
                    'bank_name': self.bank_name
                },
                'status': 'pending',
                'estimated_completion': estimated_completion.isoformat(),
                'processing_fee': self.calculate_fees(transaction.amount, transaction.currency, fee_multiplier)['total_fee']
            }
            
            self.log_debug(f"{transfer_type} initiated", {
                'internal_tx_id': internal_tx_id,
                'estimated_completion': estimated_completion.isoformat()
            })
            
            return self.create_success_result(
                transaction_id=internal_tx_id,
                gateway_response=processing_record
            )
            
        except Exception as e:
            self.log_error("Error processing bank transfer payout", e)
            return self.create_error_result(
                "An unexpected error occurred while processing the bank transfer",
                code='internal_error'
            )
    
    def process_refund(self, original_transaction, refund_amount: Decimal, 
                      reason: str = None) -> PaymentProcessorResult:
        """Process a refund via bank transfer"""
        self.log_debug("Processing bank transfer refund", {
            'original_transaction_id': str(original_transaction.id),
            'refund_amount': str(refund_amount),
            'reason': reason
        })
        
        try:
            # Generate refund transaction ID
            refund_tx_id = f"REFUND_{datetime.now().strftime('%Y%m%d')}_{str(uuid.uuid4())[:8].upper()}"
            
            # Bank transfer refunds typically take same time as regular transfers
            estimated_completion = datetime.now() + timedelta(days=self.ach_processing_days)
            
            processing_record = {
                'type': 'ach_refund',
                'original_transaction_id': original_transaction.gateway_transaction_id,
                'refund_amount': str(refund_amount),
                'currency': original_transaction.currency,
                'reason': reason or 'Customer refund request',
                'status': 'pending',
                'estimated_completion': estimated_completion.isoformat(),
                'processing_fee': self.calculate_fees(refund_amount, original_transaction.currency)['total_fee']
            }
            
            return self.create_success_result(
                transaction_id=refund_tx_id,
                gateway_response=processing_record
            )
            
        except Exception as e:
            self.log_error("Error processing bank transfer refund", e)
            return self.create_error_result(
                "An unexpected error occurred while processing the refund",
                code='internal_error'
            )
    
    def add_payment_method(self, user, method_data: Dict) -> PaymentProcessorResult:
        """Add and validate bank account details"""
        self.log_debug("Adding bank account payment method", {
            'user_id': str(user.id),
            'account_type': method_data.get('account_type')
        })
        
        try:
            # Validate required fields
            required_fields = ['account_number', 'routing_number', 'account_holder_name']
            for field in required_fields:
                if not method_data.get(field):
                    return self.create_error_result(
                        f"Missing required field: {field}",
                        code='missing_required_field'
                    )
            
            # Validate routing number (US format)
            routing_number = method_data['routing_number'].strip()
            if len(routing_number) != 9 or not routing_number.isdigit():
                return self.create_error_result(
                    "Invalid routing number format (must be 9 digits)",
                    code='invalid_routing_number'
                )
            
            # Validate account number
            account_number = method_data['account_number'].strip()
            if len(account_number) < 4 or len(account_number) > 17:
                return self.create_error_result(
                    "Invalid account number length",
                    code='invalid_account_number'
                )
            
            # Basic routing number validation (checksum)
            if not self._validate_routing_number_checksum(routing_number):
                return self.create_error_result(
                    "Invalid routing number checksum",
                    code='invalid_routing_number_checksum'
                )
            
            # Create account verification ID
            verification_id = f"VERIFY_{str(uuid.uuid4())[:8].upper()}"
            
            account_info = {
                'account_number': account_number,
                'routing_number': routing_number,
                'account_holder_name': method_data['account_holder_name'],
                'account_type': method_data.get('account_type', 'checking'),
                'bank_name': method_data.get('bank_name', ''),
                'verification_id': verification_id,
                'verification_status': 'pending',
                'verification_method': 'micro_deposits'
            }
            
            return self.create_success_result(
                transaction_id=verification_id,
                gateway_response=account_info
            )
            
        except Exception as e:
            self.log_error("Error adding bank account payment method", e)
            return self.create_error_result(
                "An unexpected error occurred while adding the bank account",
                code='internal_error'
            )
    
    def verify_payment_method(self, payment_method, verification_data: Dict) -> PaymentProcessorResult:
        """Verify bank account with micro-deposits"""
        try:
            # Simulate micro-deposit verification
            amounts = verification_data.get('amounts', [])\n            expected_amounts = [0.12, 0.34]  # Simulated amounts
            \n            if len(amounts) != 2:\n                return self.create_error_result(\n                    \"Two micro-deposit amounts are required\",\n                    code='invalid_verification_amounts'\n                )\n            \n            # Check amounts (in a real implementation, these would be stored securely)\n            amounts_cents = [int(float(amount) * 100) for amount in amounts]\n            expected_cents = [int(amount * 100) for amount in expected_amounts]\n            \n            if sorted(amounts_cents) == sorted(expected_cents):\n                return self.create_success_result(\n                    transaction_id=payment_method.id,\n                    gateway_response={'verified': True, 'verification_method': 'micro_deposits'}\n                )\n            else:\n                return self.create_error_result(\n                    \"Incorrect micro-deposit amounts\",\n                    code='incorrect_verification_amounts'\n                )\n            \n        except Exception as e:\n            self.log_error(\"Error verifying bank account\", e)\n            return self.create_error_result(\n                \"An unexpected error occurred while verifying the bank account\",\n                code='internal_error'\n            )\n    \n    def remove_payment_method(self, payment_method) -> PaymentProcessorResult:\n        \"\"\"Remove bank account (no external API call needed)\"\"\"\n        return self.create_success_result(\n            transaction_id=payment_method.id,\n            gateway_response={'removed': True}\n        )\n    \n    def verify_webhook_signature(self, payload: str, signature: str, headers: Dict) -> bool:\n        \"\"\"Bank transfers typically don't use webhooks\"\"\"\n        return True\n    \n    def process_webhook(self, event_type: str, payload: Dict) -> PaymentProcessorResult:\n        \"\"\"Process bank transfer status updates (if any)\"\"\"\n        return self.create_success_result(\n            transaction_id=payload.get('transaction_id', ''),\n            gateway_response=payload\n        )\n    \n    def get_transaction_status(self, gateway_transaction_id: str) -> PaymentProcessorResult:\n        \"\"\"Get transaction status (simulated)\"\"\"\n        try:\n            # In a real implementation, this would query the bank's API or file system\n            # For now, simulate status based on transaction age\n            \n            if gateway_transaction_id.startswith('ACH_'):\n                # Extract date from transaction ID\n                date_str = gateway_transaction_id.split('_')[1]\n                tx_date = datetime.strptime(date_str, '%Y%m%d')\n                \n                days_old = (datetime.now() - tx_date).days\n                \n                if days_old >= self.ach_processing_days:\n                    status = 'completed'\n                elif days_old >= 1:\n                    status = 'processing'\n                else:\n                    status = 'pending'\n                    \n            elif gateway_transaction_id.startswith('WIRE_'):\n                # Wire transfers are faster\n                date_str = gateway_transaction_id.split('_')[1]\n                tx_date = datetime.strptime(date_str, '%Y%m%d')\n                \n                hours_old = (datetime.now() - tx_date).total_seconds() / 3600\n                \n                if hours_old >= self.wire_processing_hours:\n                    status = 'completed'\n                elif hours_old >= 1:\n                    status = 'processing'\n                else:\n                    status = 'pending'\n            else:\n                status = 'unknown'\n            \n            return self.create_success_result(\n                transaction_id=gateway_transaction_id,\n                gateway_response={\n                    'status': status,\n                    'transaction_id': gateway_transaction_id,\n                    'last_updated': datetime.now().isoformat()\n                }\n            )\n            \n        except Exception as e:\n            self.log_error(\"Error getting transaction status\", e)\n            return self.create_error_result(\n                \"Failed to get transaction status\",\n                code='status_query_failed'\n            )\n    \n    def get_supported_currencies(self) -> list:\n        \"\"\"Get supported currencies for bank transfers\"\"\"\n        return ['USD', 'EUR', 'GBP', 'CAD', 'AUD']\n    \n    def get_supported_countries(self) -> list:\n        \"\"\"Get supported countries for bank transfers\"\"\"\n        return ['US', 'CA', 'GB', 'AU', 'EU']\n    \n    def validate_credentials(self) -> bool:\n        \"\"\"Validate bank transfer configuration\"\"\"\n        return bool(self.routing_number and self.account_number)\n    \n    def calculate_fees(self, amount: Decimal, currency: str = 'USD', multiplier: int = 1) -> Dict[str, Decimal]:\n        \"\"\"Calculate bank transfer fees\"\"\"\n        # ACH fees are typically flat rate\n        # Wire fees are higher\n        \n        if currency.upper() == 'USD':\n            if multiplier == 1:  # ACH\n                fixed_fee = Decimal('1.50')\n                percentage_fee = Decimal('0')\n            else:  # Wire transfer\n                fixed_fee = Decimal('25.00')\n                percentage_fee = Decimal('0')\n        else:\n            # International transfers\n            fixed_fee = Decimal('45.00') * multiplier\n            percentage_fee = Decimal('0.005')  # 0.5% for international\n        \n        total_fee = (amount * percentage_fee) + fixed_fee\n        \n        return {\n            'percentage_fee': amount * percentage_fee,\n            'fixed_fee': fixed_fee,\n            'total_fee': total_fee,\n            'net_amount': amount - total_fee\n        }\n    \n    def _validate_routing_number_checksum(self, routing_number: str) -> bool:\n        \"\"\"Validate US routing number using checksum algorithm\"\"\"\n        try:\n            # US routing number checksum validation\n            digits = [int(d) for d in routing_number]\n            \n            checksum = (\n                3 * (digits[0] + digits[3] + digits[6]) +\n                7 * (digits[1] + digits[4] + digits[7]) +\n                1 * (digits[2] + digits[5] + digits[8])\n            )\n            \n            return checksum % 10 == 0\n        except (ValueError, IndexError):\n            return False\n    \n    # Legacy methods for backward compatibility\n    def get_employee_account_form(self):\n        \"\"\"Return form fields needed for bank transfers\"\"\"\n        return [\n            {'name': 'account_number', 'type': 'text', 'required': True, 'label': 'Account Number'},\n            {'name': 'routing_number', 'type': 'text', 'required': True, 'label': 'Routing Number'},\n            {'name': 'account_holder_name', 'type': 'text', 'required': True, 'label': 'Account Holder Name'},\n            {'name': 'account_type', 'type': 'select', 'required': True, 'label': 'Account Type',\n             'options': [\n                 {'value': 'checking', 'label': 'Checking'},\n                 {'value': 'savings', 'label': 'Savings'}\n             ]},\n            {'name': 'bank_name', 'type': 'text', 'required': False, 'label': 'Bank Name'}\n        ]\n    \n    def validate_account_details(self, details):\n        \"\"\"Validate bank account details\"\"\"\n        required_fields = ['account_number', 'routing_number', 'account_holder_name']\n        for field in required_fields:\n            if field not in details or not details[field]:\n                return False, f\"Missing required field: {field}\"\n        \n        # Validate routing number\n        routing_number = details['routing_number'].strip()\n        if len(routing_number) != 9 or not routing_number.isdigit():\n            return False, \"Routing number must be exactly 9 digits\"\n        \n        if not self._validate_routing_number_checksum(routing_number):\n            return False, \"Invalid routing number checksum\"\n        \n        # Validate account number\n        account_number = details['account_number'].strip()\n        if len(account_number) < 4 or len(account_number) > 17:\n            return False, \"Account number must be between 4 and 17 digits\"\n        \n        return True, \"Bank account details are valid\"\n\n# Backward compatibility alias\nProvider = BankTransferProcessor"