"""
Service for handling regional discount verification and management
"""
import requests
import logging
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
from .discount_models import DevelopingCountry, DiscountVerification


logger = logging.getLogger(__name__)


class DiscountVerificationService:
    """Handle discount eligibility and verification"""
    
    @staticmethod
    def get_client_ip(request):
        """Get the real client IP address"""
        # Check for Cloudflare IP
        cf_ip = request.META.get('HTTP_CF_CONNECTING_IP')
        if cf_ip:
            return cf_ip
        
        # Check for X-Forwarded-For
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        
        # Check for X-Real-IP
        x_real_ip = request.META.get('HTTP_X_REAL_IP')
        if x_real_ip:
            return x_real_ip
        
        # Fall back to REMOTE_ADDR
        return request.META.get('REMOTE_ADDR')
    
    @staticmethod
    def get_country_from_ip(ip_address):
        """Get country code from IP address using ipapi.co"""
        cache_key = f"geo_{ip_address}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return cached_data.get('country_code')
        
        try:
            # Use ipapi.co free tier (1000 requests/day)
            response = requests.get(
                f"https://ipapi.co/{ip_address}/json/",
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                cache.set(cache_key, data, 86400)  # Cache for 24 hours
                return data.get('country_code')
        except Exception as e:
            logger.error(f"Error getting geo data for IP {ip_address}: {e}")
        
        return None
    
    @classmethod
    def check_discount_eligibility(cls, country_code, request=None):
        """
        Check if a country is eligible for regional discount
        Returns: (eligible, discount_percentage, verification_needed)
        """
        # Check if country is in developing countries list
        discount = DevelopingCountry.get_discount(country_code)
        if discount == 0:
            return False, 0, False
        
        # If we have a request, do IP verification
        verification_needed = False
        if request:
            ip_address = cls.get_client_ip(request)
            detected_country = cls.get_country_from_ip(ip_address)
            
            if detected_country and detected_country != country_code:
                # Country mismatch - still allow but flag for verification
                verification_needed = True
                logger.warning(
                    f"Country mismatch: claimed={country_code}, "
                    f"detected={detected_country}, IP={ip_address}"
                )
        
        return True, discount, verification_needed
    
    @classmethod
    def create_verification_record(cls, business, country_code, request):
        """Create a discount verification record for tracking"""
        ip_address = cls.get_client_ip(request)
        detected_country = cls.get_country_from_ip(ip_address) or ''
        
        verification = DiscountVerification.objects.create(
            business=business,
            claimed_country=country_code,
            detected_country=detected_country,
            ip_address=ip_address,
            ip_country_match=(detected_country == country_code),
            grace_period_ends=timezone.now() + timedelta(days=30)
        )
        
        # Calculate initial risk score
        risk_score = verification.calculate_risk_score()
        
        # Auto-flag high risk accounts
        if risk_score >= 70:
            verification.verification_status = 'flagged'
            verification.save()
            
            # TODO: Send notification to admin
            logger.warning(
                f"High risk discount application: Business={business.name}, "
                f"Risk Score={risk_score}"
            )
        
        return verification
    
    @classmethod
    def verify_payment_method(cls, business, payment_method_data):
        """Verify payment method country matches claimed country"""
        try:
            verification = business.discount_verification
            
            # Extract country from payment method
            payment_country = None
            if payment_method_data.get('type') == 'card':
                # Card country from Stripe
                payment_country = payment_method_data.get('card', {}).get('country')
            elif payment_method_data.get('type') == 'bank_account':
                # Bank country
                payment_country = payment_method_data.get('bank_account', {}).get('country')
            
            if payment_country:
                verification.payment_country_match = (
                    payment_country == verification.claimed_country
                )
                verification.payment_methods.append({
                    'type': payment_method_data.get('type'),
                    'country': payment_country,
                    'timestamp': timezone.now().isoformat()
                })
                verification.save()
                
                # Recalculate risk score
                risk_score = verification.calculate_risk_score()
                if verification.should_flag_for_review():
                    verification.verification_status = 'flagged'
                    verification.save()
        
        except DiscountVerification.DoesNotExist:
            pass
    
    @classmethod
    def track_login_location(cls, business, request):
        """Track login locations for behavioral analysis"""
        try:
            verification = business.discount_verification
            ip_address = cls.get_client_ip(request)
            country = cls.get_country_from_ip(ip_address)
            
            if country:
                # Update login countries
                if country not in verification.login_countries:
                    verification.login_countries[country] = 0
                verification.login_countries[country] += 1
                verification.save()
                
                # Check if we should flag
                if len(verification.login_countries) > 3:
                    risk_score = verification.calculate_risk_score()
                    if verification.should_flag_for_review():
                        verification.verification_status = 'flagged'
                        verification.save()
        
        except DiscountVerification.DoesNotExist:
            pass
    
    @classmethod
    def apply_discount_to_business(cls, business, country_code, request=None):
        """Apply regional discount to a business"""
        eligible, discount, needs_verification = cls.check_discount_eligibility(
            country_code, request
        )
        
        if eligible:
            business.regional_discount_eligible = True
            business.regional_discount_percentage = discount
            business.save()
            
            # Create verification record if we have request
            if request:
                cls.create_verification_record(business, country_code, request)
            
            return True, discount
        
        return False, 0
    
    @classmethod
    def get_stripe_price_id(cls, plan_type, is_discounted=False, billing_cycle='monthly'):
        """Get appropriate Stripe price ID based on discount status"""
        # These should be configured in settings or environment variables
        price_map = {
            'professional': {
                'monthly': {
                    'regular': settings.STRIPE_PRICE_PRO_MONTHLY,
                    'discounted': settings.STRIPE_PRICE_PRO_MONTHLY_DISCOUNTED,
                },
                'yearly': {
                    'regular': settings.STRIPE_PRICE_PRO_YEARLY,
                    'discounted': settings.STRIPE_PRICE_PRO_YEARLY_DISCOUNTED,
                }
            },
            'enterprise': {
                'monthly': {
                    'regular': settings.STRIPE_PRICE_ENT_MONTHLY,
                    'discounted': settings.STRIPE_PRICE_ENT_MONTHLY_DISCOUNTED,
                },
                'yearly': {
                    'regular': settings.STRIPE_PRICE_ENT_YEARLY,
                    'discounted': settings.STRIPE_PRICE_ENT_YEARLY_DISCOUNTED,
                }
            }
        }
        
        discount_key = 'discounted' if is_discounted else 'regular'
        return price_map.get(plan_type, {}).get(billing_cycle, {}).get(discount_key)


class DiscountMonitoringService:
    """Monitor and flag potential discount abuse"""
    
    @classmethod
    def check_verifications_due(cls):
        """Check for verifications past grace period"""
        due_verifications = DiscountVerification.objects.filter(
            verification_status='pending',
            grace_period_ends__lte=timezone.now()
        )
        
        for verification in due_verifications:
            # Flag for manual review
            verification.verification_status = 'flagged'
            verification.save()
            
            # TODO: Send notification to admin
            logger.info(
                f"Flagged business {verification.business.name} - "
                f"grace period expired"
            )
    
    @classmethod
    def generate_abuse_report(cls):
        """Generate report of flagged accounts for admin review"""
        flagged = DiscountVerification.objects.filter(
            verification_status='flagged'
        ).select_related('business')
        
        report = []
        for verification in flagged:
            report.append({
                'business_name': verification.business.name,
                'business_id': str(verification.business.id),
                'claimed_country': verification.claimed_country,
                'detected_country': verification.detected_country,
                'risk_score': verification.risk_score,
                'login_countries': list(verification.login_countries.keys()),
                'created_at': verification.created_at,
                'grace_period_ends': verification.grace_period_ends,
            })
        
        return report