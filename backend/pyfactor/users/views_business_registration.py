# Business Registration API View
# /Users/kuoldeng/projectx/backend/pyfactor/users/views_business_registration.py

import json
import logging
import uuid
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django_countries import countries

from users.models import Business, UserProfile
from custom_auth.models import User
from users.business_categories import SIMPLIFIED_BUSINESS_TYPES

logger = logging.getLogger(__name__)


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def create_business_account(request):
    """
    API endpoint to create a business account for a consumer user.
    Converts a consumer user to a business user.
    """
    try:
        # Parse request data
        data = json.loads(request.body)
        
        # Extract business data
        business_name = data.get('business_name', '').strip()
        business_type = data.get('business_type', '').upper()
        entity_type = data.get('entity_type', 'INDIVIDUAL').upper()
        registration_status = data.get('registration_status', 'INFORMAL')
        registration_number = data.get('registration_number', '').strip()
        phone = data.get('phone', '').strip()
        email = data.get('email', '').strip()
        address = data.get('address', '').strip()
        city = data.get('city', '').strip()
        business_country = data.get('business_country', data.get('country', '')).upper()
        
        # For individuals without a business name, generate one
        if entity_type == 'INDIVIDUAL' and not business_name:
            user_name = f"{request.user.first_name} {request.user.last_name}".strip()
            if not user_name or user_name == ' ':
                user_name = request.user.username or str(request.user.id)
            business_name = f"{user_name} - Service Provider"
        
        # Validate required fields
        if not business_name:
            return JsonResponse({
                'success': False,
                'error': 'Business name is required'
            }, status=400)
        
        # Map frontend business types to backend
        valid_business_types = ['SERVICE', 'RETAIL', 'MIXED', 'OTHER', 
                                'HOME_SERVICES', 'TRANSPORT_SERVICE', 'PROFESSIONAL_SERVICES',
                                'CREATIVE_SERVICES', 'SALON_SPA', 'EDUCATION_TRAINING',
                                'RETAIL_STORE', 'RESTAURANT_CAFE', 'MEDICAL_DENTAL']
        
        if business_type and business_type not in valid_business_types:
            # Try to map to a valid type
            business_type = 'OTHER'
        
        if not business_country or business_country not in dict(countries):
            business_country = 'SS'  # Default to South Sudan
        
        # Get the current user
        user = request.user
        
        # Check if user already has a business
        user_profile = UserProfile.objects.filter(user=user).first()
        if user_profile and user_profile.business_id:
            # Check if business exists
            existing_business = Business.objects.filter(id=user_profile.business_id).first()
            if existing_business:
                return JsonResponse({
                    'success': False,
                    'error': 'User already has a business account'
                }, status=400)
        
        # Create the business within a transaction
        with transaction.atomic():
            # Determine simplified business type
            if business_type in ['HOME_SERVICES', 'TRANSPORT_SERVICE', 'PROFESSIONAL_SERVICES', 
                                 'CREATIVE_SERVICES', 'EDUCATION_TRAINING']:
                simplified_type = 'SERVICE'
            elif business_type in ['RETAIL_STORE', 'RESTAURANT_CAFE', 'GROCERY_MARKET', 'PHARMACY']:
                simplified_type = 'RETAIL'
            elif business_type in ['SALON_SPA', 'MEDICAL_DENTAL', 'FITNESS_CENTER']:
                simplified_type = 'MIXED'
            else:
                simplified_type = business_type if business_type in ['SERVICE', 'RETAIL', 'MIXED'] else 'OTHER'
            
            # Determine legal structure based on entity type
            if entity_type == 'INDIVIDUAL':
                legal_structure = 'SOLE_PROPRIETORSHIP'
            elif entity_type == 'NON_PROFIT':
                legal_structure = 'NON_PROFIT'
            elif entity_type in ['SMALL_BUSINESS', 'MEDIUM_BUSINESS']:
                legal_structure = 'LIMITED_LIABILITY_COMPANY'
            elif entity_type == 'LARGE_COMPANY':
                legal_structure = 'CORPORATION'
            else:
                legal_structure = 'SOLE_PROPRIETORSHIP'
            
            # Create new business
            business = Business.objects.create(
                name=business_name,
                owner_id=uuid.UUID(int=user.id),  # Convert integer ID to UUID format
                entity_type=entity_type,
                business_type=business_type or 'OTHER',
                simplified_business_type=simplified_type,
                legal_structure=legal_structure,
                registration_status=registration_status,
                registration_number=registration_number if registration_number else None,
                phone=phone if phone else None,
                email=email if email else None,
                address=address if address else None,
                city=city if city else None,
                country=business_country,
                date_founded=timezone.now().date(),
                preferred_currency_code=get_currency_for_country(business_country),
                preferred_currency_name=get_currency_name_for_country(business_country),
                preferred_currency_symbol=get_currency_symbol_for_country(business_country),
                currency_updated_at=timezone.now()
            )
            
            # Update or create user profile
            if not user_profile:
                user_profile = UserProfile.objects.create(
                    user=user,
                    business_id=business.id,
                    tenant_id=business.id,
                    is_business_owner=True,
                    role='OWNER',
                    onboarding_completed=False  # They'll need to complete business onboarding
                )
            else:
                user_profile.business_id = business.id
                user_profile.tenant_id = business.id
                user_profile.is_business_owner = True
                user_profile.role = 'OWNER'
                user_profile.save()
            
            # Update User model to reflect business ownership
            user.role = 'OWNER'
            user.save(update_fields=['role'])
            
            # Auto-register in marketplace
            try:
                from marketplace.models import BusinessListing
                
                # Create marketplace listing
                marketplace_listing = BusinessListing.objects.create(
                    business=user,
                    business_type=business_type or 'OTHER',
                    delivery_scope='local',  # Default to local delivery
                    is_active=True,
                    is_verified=False,  # Will need verification
                    accepts_online_orders=True,
                    accepts_cash=True,
                    accepts_mobile_money=True,
                    minimum_order_amount=0,
                    average_rating=0.0,
                    total_reviews=0,
                    total_orders=0
                )
                logger.info(f"Marketplace listing created for business: {business.id}")
            except Exception as marketplace_error:
                logger.warning(f"Failed to create marketplace listing: {str(marketplace_error)}")
                # Don't fail the whole registration if marketplace creation fails
            
            logger.info(f"Business created successfully: {business.id} for user: {user.id}")
            
            # Handle courier service registration if requested
            offers_courier = data.get('offers_courier_services', False)
            if offers_courier:
                try:
                    # Import CourierProfile model
                    from couriers.models import CourierProfile
                    
                    courier_data = data.get('courier_data', {})
                    
                    # Create courier profile
                    courier_profile = CourierProfile.objects.create(
                        user=user,
                        business_id=business.id,
                        vehicle_type=courier_data.get('vehicle_type', 'motorcycle'),
                        vehicle_registration=courier_data.get('vehicle_registration', ''),
                        is_verified=False,  # Requires admin verification
                        availability_status='offline',  # Start offline
                        tenant_id=business.id
                    )
                    logger.info(f"Courier profile created for business: {business.id}")
                except Exception as courier_error:
                    logger.warning(f"Failed to create courier profile: {str(courier_error)}")
                    # Don't fail the whole registration if courier creation fails
        
        # Compute has_business (Business record now exists)
        has_business = Business.objects.filter(owner_id=user.id).exists()
        
        # Return success response with updated user info
        return JsonResponse({
            'success': True,
            'message': 'Business created successfully',
            'data': {
                'business_id': str(business.id),
                'business_name': business.name,
                'entity_type': entity_type,
                'is_business_owner': True,
                'has_business': has_business,
                'role': 'OWNER',
                'offers_courier_services': offers_courier,
                'marketplace_registered': True,
                'tenant_id': str(business.id),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'has_business': has_business,
                    'role': 'OWNER'
                }
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        logger.error(f"Error creating business account: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Failed to create business account. Please try again.'
        }, status=500)


def get_currency_for_country(country_code):
    """Get currency code for a country"""
    currency_map = {
        'US': 'USD', 'GB': 'GBP', 'KE': 'KES', 'NG': 'NGN', 'ZA': 'ZAR',
        'GH': 'GHS', 'UG': 'UGX', 'TZ': 'TZS', 'ET': 'ETB', 'RW': 'RWF',
        'SS': 'SSP', 'ZM': 'ZMW', 'ZW': 'ZWL', 'BW': 'BWP', 'NA': 'NAD',
        'MZ': 'MZN', 'MW': 'MWK', 'SN': 'XOF', 'CI': 'XOF', 'CM': 'XAF',
        'AO': 'AOA', 'GA': 'XAF', 'CG': 'XAF', 'CD': 'CDF', 'MA': 'MAD',
        'TN': 'TND', 'EG': 'EGP', 'LY': 'LYD', 'DZ': 'DZD', 'SD': 'SDG',
        'IN': 'INR', 'CN': 'CNY', 'JP': 'JPY', 'KR': 'KRW', 'ID': 'IDR',
        'PH': 'PHP', 'VN': 'VND', 'TH': 'THB', 'MY': 'MYR', 'SG': 'SGD',
        'AU': 'AUD', 'NZ': 'NZD', 'CA': 'CAD', 'MX': 'MXN', 'BR': 'BRL',
        'AR': 'ARS', 'CL': 'CLP', 'CO': 'COP', 'PE': 'PEN', 'VE': 'VES',
        'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR',
        'BE': 'EUR', 'CH': 'CHF', 'AT': 'EUR', 'SE': 'SEK', 'NO': 'NOK',
        'DK': 'DKK', 'FI': 'EUR', 'PL': 'PLN', 'RU': 'RUB', 'UA': 'UAH',
        'TR': 'TRY', 'GR': 'EUR', 'PT': 'EUR', 'IE': 'EUR', 'IL': 'ILS',
        'SA': 'SAR', 'AE': 'AED', 'QA': 'QAR', 'KW': 'KWD', 'JO': 'JOD',
        'LB': 'LBP'
    }
    return currency_map.get(country_code, 'USD')


def get_currency_name_for_country(country_code):
    """Get currency name for a country"""
    currency_names = {
        'USD': 'US Dollar', 'GBP': 'British Pound', 'EUR': 'Euro',
        'KES': 'Kenyan Shilling', 'NGN': 'Nigerian Naira', 'ZAR': 'South African Rand',
        'GHS': 'Ghanaian Cedi', 'UGX': 'Ugandan Shilling', 'TZS': 'Tanzanian Shilling',
        'ETB': 'Ethiopian Birr', 'RWF': 'Rwandan Franc', 'SSP': 'South Sudanese Pound',
        'ZMW': 'Zambian Kwacha', 'ZWL': 'Zimbabwean Dollar', 'BWP': 'Botswana Pula',
        'NAD': 'Namibian Dollar', 'MZN': 'Mozambican Metical', 'MWK': 'Malawian Kwacha',
        'XOF': 'West African CFA Franc', 'XAF': 'Central African CFA Franc',
        'AOA': 'Angolan Kwanza', 'CDF': 'Congolese Franc', 'MAD': 'Moroccan Dirham',
        'TND': 'Tunisian Dinar', 'EGP': 'Egyptian Pound', 'LYD': 'Libyan Dinar',
        'DZD': 'Algerian Dinar', 'SDG': 'Sudanese Pound', 'INR': 'Indian Rupee',
        'CNY': 'Chinese Yuan', 'JPY': 'Japanese Yen', 'KRW': 'South Korean Won',
        'IDR': 'Indonesian Rupiah', 'PHP': 'Philippine Peso', 'VND': 'Vietnamese Dong',
        'THB': 'Thai Baht', 'MYR': 'Malaysian Ringgit', 'SGD': 'Singapore Dollar',
        'AUD': 'Australian Dollar', 'NZD': 'New Zealand Dollar', 'CAD': 'Canadian Dollar',
        'MXN': 'Mexican Peso', 'BRL': 'Brazilian Real', 'ARS': 'Argentine Peso',
        'CLP': 'Chilean Peso', 'COP': 'Colombian Peso', 'PEN': 'Peruvian Sol',
        'VES': 'Venezuelan Bolívar', 'CHF': 'Swiss Franc', 'SEK': 'Swedish Krona',
        'NOK': 'Norwegian Krone', 'DKK': 'Danish Krone', 'PLN': 'Polish Złoty',
        'RUB': 'Russian Ruble', 'UAH': 'Ukrainian Hryvnia', 'TRY': 'Turkish Lira',
        'ILS': 'Israeli Shekel', 'SAR': 'Saudi Riyal', 'AED': 'UAE Dirham',
        'QAR': 'Qatari Riyal', 'KWD': 'Kuwaiti Dinar', 'JOD': 'Jordanian Dinar',
        'LBP': 'Lebanese Pound'
    }
    currency_code = get_currency_for_country(country_code)
    return currency_names.get(currency_code, 'US Dollar')


def get_currency_symbol_for_country(country_code):
    """Get currency symbol for a country"""
    currency_symbols = {
        'USD': '$', 'GBP': '£', 'EUR': '€', 'KES': 'KSh', 'NGN': '₦',
        'ZAR': 'R', 'GHS': '₵', 'UGX': 'USh', 'TZS': 'TSh', 'ETB': 'Br',
        'RWF': 'FRw', 'SSP': '£', 'ZMW': 'ZK', 'ZWL': 'Z$', 'BWP': 'P',
        'NAD': 'N$', 'MZN': 'MT', 'MWK': 'MK', 'XOF': 'CFA', 'XAF': 'FCFA',
        'AOA': 'Kz', 'CDF': 'FC', 'MAD': 'DH', 'TND': 'DT', 'EGP': 'E£',
        'LYD': 'LD', 'DZD': 'DA', 'SDG': 'SDG', 'INR': '₹', 'CNY': '¥',
        'JPY': '¥', 'KRW': '₩', 'IDR': 'Rp', 'PHP': '₱', 'VND': '₫',
        'THB': '฿', 'MYR': 'RM', 'SGD': 'S$', 'AUD': 'A$', 'NZD': 'NZ$',
        'CAD': 'C$', 'MXN': 'Mex$', 'BRL': 'R$', 'ARS': '$', 'CLP': '$',
        'COP': '$', 'PEN': 'S/', 'VES': 'Bs', 'CHF': 'CHF', 'SEK': 'kr',
        'NOK': 'kr', 'DKK': 'kr', 'PLN': 'zł', 'RUB': '₽', 'UAH': '₴',
        'TRY': '₺', 'ILS': '₪', 'SAR': 'SR', 'AED': 'AED', 'QAR': 'QR',
        'KWD': 'KD', 'JOD': 'JD', 'LBP': 'L£'
    }
    currency_code = get_currency_for_country(country_code)
    return currency_symbols.get(currency_code, '$')


@login_required
@require_http_methods(["GET"])
def check_business_status(request):
    """
    Check if the current user has a business account
    """
    try:
        user_profile = UserProfile.objects.filter(user=request.user).first()
        
        if user_profile and user_profile.is_business_owner:
            business = Business.objects.filter(id=user_profile.business_id).first()
            return JsonResponse({
                'success': True,
                'is_business_owner': True,
                'business_name': business.name if business else None,
                'business_id': str(business.id) if business else None
            })
        else:
            return JsonResponse({
                'success': True,
                'is_business_owner': False
            })
            
    except Exception as e:
        logger.error(f"Error checking business status: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Failed to check business status'
        }, status=500)