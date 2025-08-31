from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction as db_transaction
from .models import OnboardingProgress
from users.models import Business, UserProfile, BusinessSettings, BusinessDetails
import uuid
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class BusinessInfoEnhancedSerializer(serializers.ModelSerializer):
    """Enhanced serializer that handles currency and creates BusinessSettings"""
    business_name = serializers.CharField(max_length=200, source='name')
    business_type = serializers.CharField(max_length=100)
    country = serializers.CharField(max_length=2)
    currency = serializers.CharField(max_length=3, required=False, default='USD')  # Add currency field
    legal_structure = serializers.CharField(max_length=50)
    date_founded = serializers.DateField()

    class Meta:
        model = Business
        fields = [
            'business_name', 'business_type', 'country', 'currency',
            'legal_structure', 'date_founded'
        ]

    def get_currency_symbol(self, currency_code):
        """Get currency symbol from code"""
        currency_symbols = {
            'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CNY': '¥',
            'INR': '₹', 'KRW': '₩', 'BRL': 'R$', 'MXN': '$', 'CAD': 'C$',
            'AUD': 'A$', 'NZD': 'NZ$', 'CHF': 'Fr', 'SEK': 'kr', 'NOK': 'kr',
            'DKK': 'kr', 'PLN': 'zł', 'RUB': '₽', 'TRY': '₺', 'ZAR': 'R',
            'AED': 'د.إ', 'SAR': '﷼', 'NGN': '₦', 'KES': 'KSh', 'GHS': 'GH₵',
            'EGP': 'E£', 'MAD': 'DH', 'TND': 'د.ت', 'DZD': 'د.ج', 'ETB': 'Br',
            'UGX': 'USh', 'TZS': 'TSh', 'RWF': 'FRw', 'SSP': 'SSP', 'XOF': 'CFA',
            'XAF': 'FCFA', 'PHP': '₱', 'THB': '฿', 'IDR': 'Rp', 'VND': '₫',
            'PKR': '₨', 'BDT': '৳', 'LKR': 'Rs', 'NPR': '₨', 'SGD': 'S$',
            'HKD': 'HK$', 'TWD': 'NT$', 'MYR': 'RM', 'CLP': '$', 'COP': '$',
            'ARS': '$', 'PEN': 'S/', 'BOB': 'Bs', 'PYG': '₲', 'UYU': '$U',
            'VES': 'Bs', 'CRC': '₡', 'GTQ': 'Q', 'HNL': 'L', 'NIO': 'C$',
            'PAB': 'B/', 'DOP': 'RD$', 'CUP': '₱', 'JMD': 'J$', 'HTG': 'G',
            'BBD': 'Bds$', 'TTD': 'TT$', 'BSD': 'B$', 'BZD': 'BZ$',
        }
        return currency_symbols.get(currency_code, currency_code)

    def validate(self, data):
        """Validate all required fields are present"""
        required_fields = ['name', 'business_type', 'country', 'legal_structure', 'date_founded']
        for field in required_fields:
            if not data.get(field):
                raise serializers.ValidationError({field: f"{field} is required"})
        
        # Default currency to USD if not provided
        if 'currency' not in data:
            data['currency'] = 'USD'
        
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        currency_code = validated_data.pop('currency', 'USD')
        
        with db_transaction.atomic():
            # Create/update business with only the fields it actually has
            # Generate a deterministic UUID from user.id for owner_id field
            owner_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f'user-{user.id}'))
            business, created = Business.objects.update_or_create(
                owner_id=owner_uuid,
                defaults={
                    'name': validated_data['name'],
                    'owner_id': owner_uuid
                }
            )
            
            # Configure marketplace interactions based on business type
            from marketplace.business_types import get_business_config
            business_type = validated_data['business_type']
            
            # Set the business category for marketplace
            business.business_category = business_type
            
            # Get configuration for this business type
            try:
                config = get_business_config(business_type)
                
                # Set primary interaction type
                business.primary_interaction_type = config.get('primary_interaction').value
                
                # Set supported interactions
                supported = config.get('supported_interactions', [])
                business.supported_interactions = [i.value for i in supported]
                
                # Set interaction settings
                interaction_settings = {
                    'features': config.get('features', {}),
                    'ui_config': config.get('ui_config', {}),
                    'status_flow': config.get('status_flow', {}),
                }
                business.interaction_settings = interaction_settings
                
                # Mark as auto-configured
                business.auto_configured = True
                business.save()
                
                logger.info(f"Configured marketplace for {business.name} as {business_type} with {len(supported)} interaction types")
            except Exception as e:
                logger.warning(f"Could not auto-configure marketplace for business type {business_type}: {e}")
                # Set defaults if configuration fails
                business.business_category = business_type
                business.primary_interaction_type = 'order'
                business.supported_interactions = ['order', 'service']
                business.auto_configured = False
                business.save()
            
            # Create/update BusinessDetails with the detail fields (including currency)
            BusinessDetails.objects.update_or_create(
                business=business,
                defaults={
                    'business_type': validated_data['business_type'],
                    'country': validated_data['country'],
                    'legal_structure': validated_data['legal_structure'],
                    'date_founded': validated_data['date_founded'],
                    'preferred_currency_code': currency_code,
                    'preferred_currency_name': self.get_currency_name(currency_code),
                }
            )

            # Create tenant if needed
            from custom_auth.models import Tenant
            
            if not user.tenant:
                schema_name = f"tenant_{user.id}_{uuid.uuid4().hex[:8]}"
                tenant = Tenant.objects.create(
                    owner_id=str(user.id),
                    name=validated_data['name'],
                    schema_name=schema_name,
                    is_active=True
                )

                # Link tenant to user
                user.tenant = tenant
                user.save(update_fields=['tenant'])
            
            # Get tenant_id for BusinessSettings
            tenant_id = user.tenant.id if user.tenant else user.tenant_id
            
            # Create or update BusinessSettings with currency for POS and other features
            business_settings, created = BusinessSettings.objects.get_or_create(
                tenant_id=tenant_id,
                defaults={
                    'business_name': validated_data['name'],
                    'business_type': validated_data.get('business_type', 'RETAIL'),
                    'country': validated_data['country'],
                    'preferred_currency_code': currency_code,
                    'preferred_currency_symbol': self.get_currency_symbol(currency_code),
                    'tax_id': '',  # Can be updated later
                    'vat_number': '',  # Can be updated later
                    'registration_number': '',  # Can be updated later
                }
            )
            
            if not created:
                # Update existing BusinessSettings with new currency
                business_settings.preferred_currency_code = currency_code
                business_settings.preferred_currency_symbol = self.get_currency_symbol(currency_code)
                business_settings.country = validated_data['country']
                business_settings.save()
            
            logger.info(f"BusinessSettings created/updated for tenant {tenant_id} with currency {currency_code}")

            # Create or update OnboardingProgress
            progress, _ = OnboardingProgress.objects.update_or_create(
                user=user,
                defaults={
                    'business': business,
                    'current_step': 'subscription',
                    'next_step': 'payment',
                    'onboarding_status': 'subscription',
                    'progress_percentage': 30,
                    'tenant_id': tenant_id
                }
            )

            return business
    
    def get_currency_name(self, currency_code):
        """Get currency name from code"""
        currency_names = {
            'USD': 'US Dollar', 'EUR': 'Euro', 'GBP': 'British Pound', 
            'SSP': 'South Sudanese Pound', 'KES': 'Kenyan Shilling',
            'NGN': 'Nigerian Naira', 'ZAR': 'South African Rand',
            'GHS': 'Ghanaian Cedi', 'UGX': 'Ugandan Shilling',
            'TZS': 'Tanzanian Shilling', 'RWF': 'Rwandan Franc',
            'ETB': 'Ethiopian Birr', 'EGP': 'Egyptian Pound',
            # Add more as needed
        }
        return currency_names.get(currency_code, currency_code)