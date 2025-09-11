"""
Proration Service for À La Carte Feature Billing
Implements Option 1: Immediate Proration (Industry Standard)
"""
from datetime import datetime, date
from decimal import Decimal
from django.conf import settings
import stripe

# Test accounts that get full access without charges
TEST_ACCOUNTS = [
    'support@dottapps.com',
    'jubacargovillage@outlook.com'
]

# Testing mode - set to False when ready to charge
TESTING_MODE = True  # Currently in testing - no charges will be applied

class ProrationService:
    """Calculate prorated charges and credits for feature changes"""
    
    @staticmethod
    def calculate_proration(user, feature, action='add'):
        """
        Calculate prorated charge/credit using Option 1: Immediate Proration
        
        Args:
            user: User object
            feature: FeatureModule object
            action: 'add' or 'remove'
            
        Returns:
            dict with proration details
        """
        from users.models import FeatureBillingEvent
        
        # Test accounts never get charged
        if user.email in TEST_ACCOUNTS:
            return {
                'amount': Decimal('0.00'),
                'description': 'Test Account - No Charges',
                'days_remaining': 0,
                'days_in_period': 0,
                'charge_now': False,
                'is_test_account': True,
                'testing_mode': TESTING_MODE
            }
        
        # Get billing period info
        subscription = user.business.subscription
        if not subscription:
            # No subscription, can't calculate proration
            return {
                'amount': Decimal('0.00'),
                'description': 'No active subscription',
                'days_remaining': 0,
                'days_in_period': 0,
                'charge_now': False,
                'testing_mode': TESTING_MODE
            }
        
        # Calculate billing period dates
        today = date.today()
        
        # Get current period end date
        if subscription.current_period_end:
            billing_period_end = subscription.current_period_end
        else:
            # Default to end of current month if not set
            from dateutil.relativedelta import relativedelta
            billing_period_end = (today + relativedelta(months=1)).replace(day=1) - relativedelta(days=1)
        
        # Calculate days
        days_remaining = (billing_period_end - today).days + 1  # Include today
        if days_remaining < 0:
            days_remaining = 0
        
        # Get days in current billing period (usually 28-31)
        if subscription.billing_cycle == 'monthly':
            # Get first day of current month
            period_start = today.replace(day=1)
            days_in_period = (billing_period_end - period_start).days + 1
        elif subscription.billing_cycle == 'annual' or subscription.billing_cycle == 'yearly':
            days_in_period = 365
        else:
            # Default to 30 days
            days_in_period = 30
        
        # Get appropriate price based on country
        if hasattr(user.business, 'is_developing_country') and user.business.is_developing_country:
            feature_price = feature.developing_country_price
        else:
            feature_price = feature.monthly_price
        
        # Calculate prorated amount
        if days_in_period > 0:
            proration_rate = Decimal(days_remaining) / Decimal(days_in_period)
            prorated_amount = feature_price * proration_rate
        else:
            prorated_amount = Decimal('0.00')
        
        # Round to 2 decimal places
        prorated_amount = round(prorated_amount, 2)
        
        # Create billing event record
        event = FeatureBillingEvent.objects.create(
            business=user.business,
            feature_module=feature,
            event_type=action,
            prorated_amount=prorated_amount if action == 'add' else -prorated_amount,
            days_remaining=days_remaining,
            days_in_period=days_in_period,
            charged=not TESTING_MODE  # Only charge in production
        )
        
        # Generate description
        if action == 'add':
            description = f"Prorated charge for {feature.name} ({days_remaining} days remaining of {days_in_period})"
        else:
            description = f"Prorated credit for removing {feature.name} ({days_remaining} days unused of {days_in_period})"
        
        return {
            'amount': prorated_amount,
            'description': description,
            'days_remaining': days_remaining,
            'days_in_period': days_in_period,
            'charge_now': not TESTING_MODE,
            'testing_mode': TESTING_MODE,
            'is_test_account': False,
            'billing_event_id': str(event.id)
        }
    
    @staticmethod
    def process_stripe_charge(user, amount, description):
        """Process immediate Stripe charge for feature addition"""
        if TESTING_MODE or amount <= 0:
            return None
            
        try:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            
            # Create charge
            charge = stripe.Charge.create(
                amount=int(amount * 100),  # Convert to cents
                currency='usd',
                customer=user.business.stripe_customer_id,
                description=description,
                metadata={
                    'business_id': str(user.business.id),
                    'user_email': user.email,
                    'type': 'feature_proration'
                }
            )
            
            return charge.id
        except Exception as e:
            print(f"Stripe charge error: {e}")
            return None
    
    @staticmethod
    def process_stripe_credit(user, amount, description):
        """Process immediate Stripe credit for feature removal"""
        if TESTING_MODE or amount <= 0:
            return None
            
        try:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            
            # Create customer balance transaction (credit)
            credit = stripe.Customer.create_balance_transaction(
                user.business.stripe_customer_id,
                amount=-int(amount * 100),  # Negative for credit
                currency='usd',
                description=description
            )
            
            return credit.id
        except Exception as e:
            print(f"Stripe credit error: {e}")
            return None
    
    @staticmethod
    def calculate_monthly_total(business):
        """Calculate total monthly cost including all active features"""
        from users.models import BusinessFeatureModule
        
        # Get base subscription price
        subscription = business.subscription
        if subscription:
            if subscription.selected_plan == 'professional':
                base_price = Decimal('10.00')
            elif subscription.selected_plan == 'enterprise':
                base_price = Decimal('45.00')
            else:
                base_price = Decimal('0.00')  # Free plan
        else:
            base_price = Decimal('0.00')
        
        # Apply developing country discount if applicable
        if business.is_developing_country:
            base_price = base_price * Decimal('0.5')  # 50% discount
        
        # Calculate feature modules total
        active_modules = BusinessFeatureModule.objects.filter(
            business=business,
            enabled=True
        ).select_related('feature_module')
        
        feature_total = Decimal('0.00')
        for module in active_modules:
            if business.is_developing_country:
                feature_total += module.feature_module.developing_country_price
            else:
                feature_total += module.feature_module.monthly_price
        
        return {
            'base_price': base_price,
            'feature_total': feature_total,
            'total': base_price + feature_total,
            'is_developing_country': business.is_developing_country,
            'testing_mode': TESTING_MODE
        }