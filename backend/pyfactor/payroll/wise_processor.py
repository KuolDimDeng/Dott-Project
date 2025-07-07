"""
Wise (TransferWise) Payroll Processor
Handles international payments via Wise API
"""
import requests
import logging
from decimal import Decimal
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class WisePayrollProcessor:
    """
    Process payroll payments via Wise for international transfers
    """
    
    def __init__(self):
        self.api_url = "https://api.wise.com"
        self.api_token = settings.WISE_API_TOKEN if hasattr(settings, 'WISE_API_TOKEN') else None
        self.profile_id = settings.WISE_PROFILE_ID if hasattr(settings, 'WISE_PROFILE_ID') else None
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
    
    def invite_employee(self, employee):
        """
        Send invitation to employee to add their bank details
        Employee manages their own bank information
        """
        if not self.api_token:
            logger.error("Wise API token not configured")
            return {'success': False, 'error': 'Wise not configured'}
        
        try:
            invitation_data = {
                "email": employee.email,
                "name": f"{employee.first_name} {employee.last_name}",
                "currency": employee.currency or 'USD',
                "profileId": self.profile_id,
                "details": {
                    "reference": f"EMP-{employee.id}",
                    "type": "payroll_recipient"
                }
            }
            
            response = requests.post(
                f"{self.api_url}/v1/profiles/{self.profile_id}/invitations",
                json=invitation_data,
                headers=self.headers
            )
            
            if response.status_code == 200:
                invitation = response.json()
                
                # Store invitation ID
                from .models import EmployeePaymentSetup
                setup, created = EmployeePaymentSetup.objects.get_or_create(
                    employee=employee,
                    defaults={
                        'payment_provider': 'wise',
                        'setup_status': 'invitation_sent'
                    }
                )
                setup.provider_reference_id = invitation['id']
                setup.invitation_sent_at = timezone.now()
                setup.save()
                
                return {
                    'success': True,
                    'invitation_id': invitation['id'],
                    'message': 'Invitation sent to employee'
                }
            else:
                error_msg = response.json().get('message', 'Unknown error')
                logger.error(f"Wise invitation failed: {error_msg}")
                return {'success': False, 'error': error_msg}
                
        except Exception as e:
            logger.error(f"Error inviting employee via Wise: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def process_batch(self, payments, payroll_run):
        """
        Process a batch of payments via Wise
        """
        if not self.api_token:
            return {
                'successful': 0,
                'failed': len(payments),
                'errors': ['Wise API not configured']
            }
        
        try:
            # Step 1: Create batch
            batch_data = {
                "name": f"Payroll-{payroll_run.pay_date}",
                "sourceCurrency": payroll_run.currency_code or 'USD',
                "transfers": []
            }
            
            # Add each payment to batch
            for payment in payments:
                employee = payment.employee
                
                # Check if employee has Wise recipient ID
                if not hasattr(employee, 'wise_recipient_id') or not employee.wise_recipient_id:
                    logger.warning(f"Employee {employee.id} has no Wise recipient ID")
                    continue
                
                transfer = {
                    "targetAccount": employee.wise_recipient_id,
                    "quoteUuid": None,  # Will be set after creating quotes
                    "customerTransactionId": str(payment.id),
                    "details": {
                        "reference": f"Salary-{payroll_run.pay_date}-{employee.employee_id}",
                        "transferPurpose": "SALARY",
                        "sourceOfFunds": "BUSINESS"
                    }
                }
                
                # Handle currency conversion
                if employee.currency != payroll_run.currency_code:
                    transfer["targetCurrency"] = employee.currency
                    transfer["targetAmount"] = float(payment.net_pay)
                else:
                    transfer["sourceAmount"] = float(payment.net_pay)
                
                batch_data["transfers"].append(transfer)
            
            if not batch_data["transfers"]:
                return {
                    'successful': 0,
                    'failed': len(payments),
                    'errors': ['No valid recipients found']
                }
            
            # Step 2: Create quotes for each currency
            quotes = self._create_quotes_for_batch(batch_data)
            
            # Step 3: Update batch with quote IDs
            for i, transfer in enumerate(batch_data["transfers"]):
                currency = transfer.get("targetCurrency", batch_data["sourceCurrency"])
                transfer["quoteUuid"] = quotes.get(currency)
            
            # Step 4: Create the batch
            batch_response = requests.post(
                f"{self.api_url}/v3/profiles/{self.profile_id}/batches",
                json=batch_data,
                headers=self.headers
            )
            
            if batch_response.status_code != 200:
                raise Exception(f"Failed to create batch: {batch_response.text}")
            
            batch = batch_response.json()
            batch_id = batch['id']
            
            # Step 5: Fund the batch
            funding_response = self._fund_batch(batch_id, payroll_run.total_amount)
            
            # Step 6: Track payments
            self._track_batch_payments(batch_id, payments)
            
            return {
                'successful': len(batch_data["transfers"]),
                'failed': len(payments) - len(batch_data["transfers"]),
                'batch_id': batch_id,
                'errors': []
            }
            
        except Exception as e:
            logger.error(f"Error processing Wise batch: {str(e)}")
            return {
                'successful': 0,
                'failed': len(payments),
                'errors': [str(e)]
            }
    
    def _create_quotes_for_batch(self, batch_data):
        """
        Create currency quotes for the batch
        """
        quotes = {}
        currencies_needed = set()
        
        for transfer in batch_data["transfers"]:
            target_currency = transfer.get("targetCurrency", batch_data["sourceCurrency"])
            currencies_needed.add(target_currency)
        
        for currency in currencies_needed:
            if currency == batch_data["sourceCurrency"]:
                continue
                
            quote_data = {
                "profile": self.profile_id,
                "source": batch_data["sourceCurrency"],
                "target": currency,
                "rateType": "FIXED",
                "targetAmount": 1000,  # Sample amount for rate
                "type": "BALANCE_PAYOUT"
            }
            
            response = requests.post(
                f"{self.api_url}/v2/quotes",
                json=quote_data,
                headers=self.headers
            )
            
            if response.status_code == 200:
                quote = response.json()
                quotes[currency] = quote['id']
        
        return quotes
    
    def _fund_batch(self, batch_id, total_amount):
        """
        Fund the batch from Wise balance or connected bank
        """
        funding_data = {
            "type": "BALANCE"  # Use Wise balance
        }
        
        response = requests.post(
            f"{self.api_url}/v3/profiles/{self.profile_id}/batches/{batch_id}/payments",
            json=funding_data,
            headers=self.headers
        )
        
        return response.json()
    
    def _track_batch_payments(self, batch_id, payments):
        """
        Update payment records with Wise batch info
        """
        from .stripe_models import EmployeePayoutRecord
        
        for payment in payments:
            try:
                payout_record, created = EmployeePayoutRecord.objects.get_or_create(
                    payroll_transaction=payment,
                    employee=payment.employee,
                    tenant_id=payment.tenant_id,
                    defaults={
                        'payout_amount': payment.net_pay,
                        'payout_status': 'processing',
                        'initiated_at': timezone.now()
                    }
                )
                
                payout_record.wise_batch_id = batch_id
                payout_record.payment_provider = 'wise'
                payout_record.save()
                
            except Exception as e:
                logger.error(f"Error tracking Wise payment: {str(e)}")
    
    def check_recipient_status(self, employee):
        """
        Check if employee has completed Wise setup
        """
        if not hasattr(employee, 'wise_recipient_id'):
            return {'setup_complete': False, 'status': 'not_invited'}
        
        try:
            response = requests.get(
                f"{self.api_url}/v1/accounts/{employee.wise_recipient_id}",
                headers=self.headers
            )
            
            if response.status_code == 200:
                recipient = response.json()
                return {
                    'setup_complete': True,
                    'status': 'active',
                    'details': {
                        'name': recipient.get('accountHolderName'),
                        'currency': recipient.get('currency'),
                        'country': recipient.get('country')
                    }
                }
            else:
                return {'setup_complete': False, 'status': 'pending'}
                
        except Exception as e:
            logger.error(f"Error checking Wise recipient: {str(e)}")
            return {'setup_complete': False, 'status': 'error', 'error': str(e)}