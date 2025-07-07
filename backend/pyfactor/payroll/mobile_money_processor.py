"""
Mobile Money Processor for Africa and Asia
Integrates with Paystack, M-Pesa, MTN, and other mobile money providers
"""
import requests
import logging
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from .payment_providers import MOBILE_MONEY_COUNTRIES, PAYSTACK_COUNTRIES

logger = logging.getLogger(__name__)


class MobileMoneyProcessor:
    """
    Process payroll payments via mobile money providers
    """
    
    def __init__(self):
        # Paystack configuration
        self.paystack_secret = settings.PAYSTACK_SECRET_KEY if hasattr(settings, 'PAYSTACK_SECRET_KEY') else None
        self.paystack_url = "https://api.paystack.co"
        self.paystack_headers = {
            "Authorization": f"Bearer {self.paystack_secret}",
            "Content-Type": "application/json"
        }
        
        # M-Pesa configuration (would be set up for production)
        self.mpesa_config = {
            'consumer_key': settings.MPESA_CONSUMER_KEY if hasattr(settings, 'MPESA_CONSUMER_KEY') else None,
            'consumer_secret': settings.MPESA_CONSUMER_SECRET if hasattr(settings, 'MPESA_CONSUMER_SECRET') else None,
            'shortcode': settings.MPESA_SHORTCODE if hasattr(settings, 'MPESA_SHORTCODE') else None,
        }
    
    def setup_employee(self, employee):
        """
        Set up mobile money for employee - just need phone number
        """
        from .models import EmployeePaymentSetup
        
        if not employee.phone_number:
            return {
                'success': False,
                'error': 'Phone number required for mobile money'
            }
        
        # Validate phone number format based on country
        validated_phone = self._validate_phone_number(
            employee.phone_number,
            employee.country
        )
        
        if not validated_phone:
            return {
                'success': False,
                'error': 'Invalid phone number format'
            }
        
        # Create payment setup record
        setup, created = EmployeePaymentSetup.objects.get_or_create(
            employee=employee,
            defaults={
                'payment_provider': 'mobile_money',
                'setup_status': 'active',
                'mobile_money_number': validated_phone,
                'mobile_money_provider': self._get_default_provider(employee.country)
            }
        )
        
        if not created:
            setup.mobile_money_number = validated_phone
            setup.setup_status = 'active'
            setup.save()
        
        return {
            'success': True,
            'phone_number': validated_phone,
            'provider': setup.mobile_money_provider,
            'message': 'Mobile money setup complete'
        }
    
    def process_batch(self, payments, payroll_run):
        """
        Process batch of mobile money payments
        """
        # Group by country/provider
        payments_by_provider = self._group_by_provider(payments)
        
        results = {
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        for provider, provider_payments in payments_by_provider.items():
            if provider == 'paystack':
                result = self._process_paystack_batch(provider_payments, payroll_run)
            elif provider == 'mpesa':
                result = self._process_mpesa_batch(provider_payments, payroll_run)
            else:
                # Generic mobile money processing
                result = self._process_generic_batch(provider_payments, payroll_run, provider)
            
            results['successful'] += result['successful']
            results['failed'] += result['failed']
            results['errors'].extend(result.get('errors', []))
        
        return results
    
    def _process_paystack_batch(self, payments, payroll_run):
        """
        Process payments via Paystack (Nigeria, Ghana, South Africa, Kenya)
        """
        if not self.paystack_secret:
            return {
                'successful': 0,
                'failed': len(payments),
                'errors': ['Paystack not configured']
            }
        
        successful = 0
        failed = 0
        errors = []
        
        # Prepare bulk transfer
        transfers = []
        for payment in payments:
            employee = payment.employee
            
            # Get employee's mobile money number
            setup = self._get_employee_setup(employee)
            if not setup or not setup.mobile_money_number:
                failed += 1
                errors.append(f"No mobile money number for {employee.id}")
                continue
            
            transfer = {
                "type": "mobile_money",
                "name": f"{employee.first_name} {employee.last_name}",
                "account_number": setup.mobile_money_number,
                "bank_code": self._get_paystack_bank_code(employee.country),
                "currency": employee.currency,
                "amount": int(payment.net_pay * 100),  # Convert to lowest currency unit
                "reference": f"SAL-{payroll_run.id}-{employee.id}",
                "reason": f"Salary payment - {payroll_run.pay_date}"
            }
            transfers.append(transfer)
        
        if not transfers:
            return {'successful': 0, 'failed': len(payments), 'errors': errors}
        
        try:
            # Initiate bulk transfer
            response = requests.post(
                f"{self.paystack_url}/transfer/bulk",
                json={"currency": payroll_run.currency_code, "transfers": transfers},
                headers=self.paystack_headers
            )
            
            if response.status_code == 200:
                data = response.json()
                if data['status']:
                    batch_code = data['data']['batch_code']
                    
                    # Track individual transfers
                    for i, payment in enumerate(payments[:len(transfers)]):
                        self._track_mobile_money_payment(
                            payment,
                            'paystack',
                            batch_code,
                            'processing'
                        )
                    
                    successful = len(transfers)
                else:
                    failed = len(payments)
                    errors.append(data.get('message', 'Paystack transfer failed'))
            else:
                failed = len(payments)
                errors.append(f"Paystack API error: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Paystack batch error: {str(e)}")
            failed = len(payments)
            errors.append(str(e))
        
        return {
            'successful': successful,
            'failed': failed,
            'errors': errors
        }
    
    def _process_mpesa_batch(self, payments, payroll_run):
        """
        Process M-Pesa payments (Kenya, Tanzania)
        """
        successful = 0
        failed = 0
        errors = []
        
        # M-Pesa requires individual B2C API calls
        for payment in payments:
            try:
                employee = payment.employee
                setup = self._get_employee_setup(employee)
                
                if not setup or not setup.mobile_money_number:
                    failed += 1
                    errors.append(f"No M-Pesa number for {employee.id}")
                    continue
                
                # Format phone number for M-Pesa (254XXXXXXXXX)
                phone = self._format_mpesa_number(setup.mobile_money_number, employee.country)
                
                # In production, this would call M-Pesa B2C API
                # For now, we'll simulate the request
                result = self._simulate_mpesa_transfer({
                    'phone_number': phone,
                    'amount': float(payment.net_pay),
                    'reference': f"SAL{payroll_run.id}E{employee.id}",
                    'occasion': f"Salary-{payroll_run.pay_date}"
                })
                
                if result['success']:
                    self._track_mobile_money_payment(
                        payment,
                        'mpesa',
                        result['transaction_id'],
                        'processing'
                    )
                    successful += 1
                else:
                    failed += 1
                    errors.append(result['error'])
                    
            except Exception as e:
                logger.error(f"M-Pesa payment error: {str(e)}")
                failed += 1
                errors.append(str(e))
        
        return {
            'successful': successful,
            'failed': failed,
            'errors': errors
        }
    
    def _process_generic_batch(self, payments, payroll_run, provider):
        """
        Process other mobile money providers
        """
        # This would integrate with MTN Mobile Money, Orange Money, etc.
        # For now, we'll track the payments for future processing
        
        successful = 0
        failed = 0
        
        for payment in payments:
            try:
                self._track_mobile_money_payment(
                    payment,
                    provider,
                    f"PENDING-{payment.id}",
                    'pending'
                )
                successful += 1
            except Exception as e:
                logger.error(f"Error tracking {provider} payment: {str(e)}")
                failed += 1
        
        return {
            'successful': successful,
            'failed': failed,
            'errors': []
        }
    
    def _group_by_provider(self, payments):
        """
        Group payments by mobile money provider
        """
        grouped = {}
        
        for payment in payments:
            employee = payment.employee
            country = employee.country
            
            if country in PAYSTACK_COUNTRIES:
                provider = 'paystack'
            elif country in ['KE', 'TZ']:
                provider = 'mpesa'
            elif country in MOBILE_MONEY_COUNTRIES:
                # Get primary provider for country
                provider = MOBILE_MONEY_COUNTRIES[country]['providers'][0]
            else:
                provider = 'unknown'
            
            if provider not in grouped:
                grouped[provider] = []
            grouped[provider].append(payment)
        
        return grouped
    
    def _get_employee_setup(self, employee):
        """
        Get employee's mobile money setup
        """
        try:
            from .models import EmployeePaymentSetup
            return EmployeePaymentSetup.objects.get(
                employee=employee,
                payment_provider='mobile_money'
            )
        except:
            return None
    
    def _track_mobile_money_payment(self, payment, provider, reference_id, status):
        """
        Track mobile money payment
        """
        from .stripe_models import EmployeePayoutRecord
        
        payout_record, created = EmployeePayoutRecord.objects.get_or_create(
            payroll_transaction=payment,
            employee=payment.employee,
            tenant_id=payment.tenant_id,
            defaults={
                'payout_amount': payment.net_pay,
                'payout_status': status,
                'initiated_at': timezone.now(),
                'payment_provider': provider,
                'mobile_money_reference': reference_id
            }
        )
        
        if not created:
            payout_record.payment_provider = provider
            payout_record.mobile_money_reference = reference_id
            payout_record.payout_status = status
            payout_record.save()
    
    def _validate_phone_number(self, phone, country):
        """
        Validate and format phone number based on country
        """
        # Remove spaces and special characters
        phone = ''.join(filter(str.isdigit, phone))
        
        # Country-specific validation
        if country == 'KE':  # Kenya
            if phone.startswith('254'):
                return phone if len(phone) == 12 else None
            elif phone.startswith('0'):
                return '254' + phone[1:] if len(phone) == 10 else None
            elif phone.startswith('7') or phone.startswith('1'):
                return '254' + phone if len(phone) == 9 else None
        
        elif country == 'NG':  # Nigeria
            if phone.startswith('234'):
                return phone if len(phone) == 13 else None
            elif phone.startswith('0'):
                return '234' + phone[1:] if len(phone) == 11 else None
        
        elif country == 'GH':  # Ghana
            if phone.startswith('233'):
                return phone if len(phone) == 12 else None
            elif phone.startswith('0'):
                return '233' + phone[1:] if len(phone) == 10 else None
        
        # Default: return as is if it looks like international format
        if phone.startswith('+'):
            return phone[1:]
        return phone
    
    def _get_default_provider(self, country):
        """
        Get default mobile money provider for country
        """
        if country in MOBILE_MONEY_COUNTRIES:
            return MOBILE_MONEY_COUNTRIES[country]['providers'][0]
        return 'unknown'
    
    def _get_paystack_bank_code(self, country):
        """
        Get Paystack bank code for mobile money
        """
        codes = {
            'NG': 'NGN-MOBILE',
            'GH': 'GHS-MOBILE',
            'ZA': 'ZAR-MOBILE',
            'KE': 'KES-MOBILE'
        }
        return codes.get(country, 'MOBILE')
    
    def _format_mpesa_number(self, phone, country):
        """
        Format phone number for M-Pesa
        """
        if country == 'KE':
            return self._validate_phone_number(phone, 'KE')
        elif country == 'TZ':
            # Tanzania format
            if phone.startswith('255'):
                return phone
            elif phone.startswith('0'):
                return '255' + phone[1:]
        return phone
    
    def _simulate_mpesa_transfer(self, data):
        """
        Simulate M-Pesa transfer for development
        In production, this would call actual M-Pesa API
        """
        import random
        import string
        
        # Generate mock transaction ID
        tx_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
        
        return {
            'success': True,
            'transaction_id': tx_id,
            'message': 'Transfer initiated'
        }