"""
Universal Payroll Processor - Routes payments to appropriate provider
Maintains consistent 2.4% platform fee across all providers
"""
import stripe
import logging
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from .payment_providers import (
    get_optimal_provider, get_available_payment_methods,
    MOBILE_MONEY_COUNTRIES, PAYSTACK_COUNTRIES
)
from .stripe_processor import StripePayrollProcessor
from .wise_processor import WisePayrollProcessor
from .mobile_money_processor import MobileMoneyProcessor

logger = logging.getLogger(__name__)


class UniversalPayrollProcessor:
    """
    Routes payroll payments to the appropriate provider based on country
    Maintains consistent 2.4% platform fee across all providers
    """
    
    def __init__(self):
        self.platform_fee_rate = Decimal('0.024')  # 2.4% flat rate for all
        self.processors = {
            'stripe': StripePayrollProcessor(),
            'wise': WisePayrollProcessor(),
            'mobile_money': MobileMoneyProcessor(),
        }
    
    def process_payroll(self, payroll_run):
        """
        Process entire payroll run, routing to appropriate providers
        """
        from .models import PayrollTransaction
        from .stripe_models import PayrollStripePayment
        
        # Group payments by provider
        payments_by_provider = self._group_payments_by_provider(payroll_run)
        
        # Calculate total platform fee (2.4% of total payroll)
        total_payroll = sum(p.net_pay for p in payroll_run.payrolltransaction_set.all())
        platform_fee = total_payroll * self.platform_fee_rate
        
        # Update stripe payment record with platform fee
        stripe_payment = payroll_run.stripe_payment
        stripe_payment.platform_fee_amount = platform_fee
        stripe_payment.save()
        
        results = {
            'successful': 0,
            'failed': 0,
            'providers_used': [],
            'errors': []
        }
        
        # Process each provider group
        for provider, payments in payments_by_provider.items():
            try:
                processor = self.processors[provider]
                provider_result = processor.process_batch(payments, payroll_run)
                
                results['successful'] += provider_result['successful']
                results['failed'] += provider_result['failed']
                results['providers_used'].append(provider)
                
                if provider_result.get('errors'):
                    results['errors'].extend(provider_result['errors'])
                    
            except Exception as e:
                logger.error(f"Error processing {provider} payments: {str(e)}")
                results['failed'] += len(payments)
                results['errors'].append({
                    'provider': provider,
                    'error': str(e),
                    'payment_count': len(payments)
                })
        
        # Update payroll run status
        if results['failed'] == 0:
            payroll_run.status = 'completed'
        elif results['successful'] > 0:
            payroll_run.status = 'partially_completed'
        else:
            payroll_run.status = 'failed'
        
        payroll_run.save()
        
        return results
    
    def _group_payments_by_provider(self, payroll_run):
        """
        Group payments by optimal provider based on employee country
        """
        payments_by_provider = {
            'stripe': [],
            'wise': [],
            'mobile_money': []
        }
        
        for payment in payroll_run.payrolltransaction_set.all():
            employee = payment.employee
            
            # Check employee's payment preference
            if hasattr(employee, 'payment_preference'):
                provider = employee.payment_preference
            else:
                # Auto-select optimal provider
                provider = get_optimal_provider(
                    employee.country,
                    employee.preferred_payment_method if hasattr(employee, 'preferred_payment_method') else None
                )
            
            if provider:
                payments_by_provider[provider].append(payment)
            else:
                logger.error(f"No payment provider available for {employee.country}")
        
        # Remove empty groups
        return {k: v for k, v in payments_by_provider.items() if v}
    
    def calculate_total_cost(self, payroll_run, detailed=False):
        """
        Calculate total cost including platform fee
        Returns same 2.4% regardless of provider
        """
        total_salaries = Decimal('0')
        payment_counts = {
            'stripe': 0,
            'wise': 0,
            'mobile_money': 0
        }
        
        for payment in payroll_run.payrolltransaction_set.all():
            total_salaries += payment.net_pay
            provider = get_optimal_provider(payment.employee.country)
            if provider:
                payment_counts[provider] += 1
        
        # Flat 2.4% platform fee
        platform_fee = total_salaries * self.platform_fee_rate
        total_cost = total_salaries + platform_fee
        
        if detailed:
            return {
                'salaries': float(total_salaries),
                'platform_fee': float(platform_fee),
                'platform_fee_percentage': '2.4%',
                'total_cost': float(total_cost),
                'payment_breakdown': payment_counts,
                'cost_per_employee': float(platform_fee / len(payroll_run.payrolltransaction_set.all())) if payroll_run.payrolltransaction_set.count() > 0 else 0
            }
        
        return float(total_cost)
    
    def get_employee_payment_options(self, employee):
        """
        Get available payment methods for an employee based on their country
        """
        return get_available_payment_methods(employee.country)
    
    def setup_employee_payment_method(self, employee, method_type):
        """
        Set up payment method for employee based on their choice
        """
        country = employee.country
        
        if method_type == 'mobile_money' and country in MOBILE_MONEY_COUNTRIES:
            return self.processors['mobile_money'].setup_employee(employee)
        
        elif method_type == 'bank_transfer':
            # Prefer Stripe if available, otherwise Wise
            if country in get_optimal_provider(country) == 'stripe':
                return self.processors['stripe'].setup_employee_bank(employee)
            else:
                return self.processors['wise'].invite_employee(employee)
        
        else:
            raise ValueError(f"Invalid payment method {method_type} for country {country}")
    
    def validate_payroll_funding(self, business, total_amount):
        """
        Ensure business has proper funding setup
        """
        # Check if business has any payment method set up
        has_stripe = bool(business.stripe_customer_id and business.default_bank_token)
        has_wise = bool(hasattr(business, 'wise_profile_id') and business.wise_profile_id)
        
        if not has_stripe and not has_wise:
            return {
                'valid': False,
                'error': 'No payment method set up. Please connect a bank account.',
                'setup_required': True
            }
        
        # Calculate total with platform fee
        total_with_fee = total_amount * (1 + self.platform_fee_rate)
        
        # For Stripe, check if mandate exists
        if has_stripe and not business.ach_mandate_id:
            return {
                'valid': False,
                'error': 'Bank authorization required',
                'setup_required': True
            }
        
        return {
            'valid': True,
            'total_amount': float(total_amount),
            'platform_fee': float(total_amount * self.platform_fee_rate),
            'total_charge': float(total_with_fee),
            'payment_method': 'stripe' if has_stripe else 'wise'
        }