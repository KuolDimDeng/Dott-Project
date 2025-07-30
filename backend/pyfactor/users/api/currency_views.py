"""
API views for currency preferences management
"""
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError
from users.models import Business, BusinessDetails, UserProfile
from currency.currency_data import get_currency_list, get_currency_info
from currency.exchange_rate_service import exchange_rate_service
from currency.currency_validator import CurrencyValidator, CurrencyConversionValidator
from decimal import Decimal
import traceback

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def currency_diagnostic(request):
    """Diagnostic endpoint to check currency system health"""
    try:
        user = request.user
        diagnostics = {
            'user_info': {
                'email': user.email,
                'id': str(user.id),
                'has_business_id': hasattr(user, 'business_id'),
                'business_id': str(user.business_id) if hasattr(user, 'business_id') and user.business_id else None,
                'has_tenant_id': hasattr(user, 'tenant_id'),
                'tenant_id': str(user.tenant_id) if hasattr(user, 'tenant_id') and user.tenant_id else None,
                'role': user.role if hasattr(user, 'role') else 'No role attribute',
            }
        }
        
        # Check if we can get the business
        business_id = None
        if hasattr(user, 'business_id') and user.business_id:
            business_id = user.business_id
        elif hasattr(user, 'tenant_id') and user.tenant_id:
            business_id = user.tenant_id
        
        if business_id:
            try:
                business = Business.objects.get(id=business_id)
                diagnostics['business_info'] = {
                    'found': True,
                    'id': str(business.id),
                    'name': business.name,
                }
                
                # Check BusinessDetails
                try:
                    business_details = BusinessDetails.objects.get(business=business)
                    diagnostics['business_details'] = {
                        'exists': True,
                        'fields': [f.name for f in BusinessDetails._meta.get_fields()],
                        'has_currency_fields': all([
                            hasattr(business_details, 'preferred_currency_code'),
                            hasattr(business_details, 'preferred_currency_name'),
                            hasattr(business_details, 'show_usd_on_invoices'),
                            hasattr(business_details, 'show_usd_on_quotes'),
                            hasattr(business_details, 'show_usd_on_reports'),
                        ]),
                        'current_values': {
                            'preferred_currency_code': getattr(business_details, 'preferred_currency_code', 'MISSING'),
                            'preferred_currency_name': getattr(business_details, 'preferred_currency_name', 'MISSING'),
                            'show_usd_on_invoices': getattr(business_details, 'show_usd_on_invoices', 'MISSING'),
                            'show_usd_on_quotes': getattr(business_details, 'show_usd_on_quotes', 'MISSING'),
                            'show_usd_on_reports': getattr(business_details, 'show_usd_on_reports', 'MISSING'),
                        }
                    }
                except BusinessDetails.DoesNotExist:
                    diagnostics['business_details'] = {
                        'exists': False,
                        'fields': [f.name for f in BusinessDetails._meta.get_fields()],
                    }
            except Business.DoesNotExist:
                diagnostics['business_info'] = {'found': False, 'id': str(business_id)}
        else:
            diagnostics['business_info'] = {'found': False, 'reason': 'No business_id on user'}
        
        # Test currency data
        diagnostics['currency_system'] = {
            'ssp_exists': bool(get_currency_info('SSP')),
            'ssp_info': get_currency_info('SSP'),
            'total_currencies': len(get_currency_list()),
        }
        
        return Response({
            'success': True,
            'diagnostics': diagnostics
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def test_auth_public(request):
    """Test endpoint without authentication to verify routing"""
    logger.info("[TEST AUTH PUBLIC] === REQUEST RECEIVED ===")
    logger.info(f"[TEST AUTH PUBLIC] Request method: {request.method}")
    logger.info(f"[TEST AUTH PUBLIC] Request path: {request.path}")
    logger.info(f"[TEST AUTH PUBLIC] Request headers: {dict(request.headers)}")
    
    return Response({
        'success': True,
        'message': 'Public test endpoint is working',
        'timestamp': timezone.now().isoformat(),
        'method': request.method,
        'path': request.path
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_auth(request):
    """Test endpoint to verify authentication is working"""
    logger.info("[TEST AUTH] === REQUEST RECEIVED ===")
    logger.info(f"[TEST AUTH] User: {request.user}")
    logger.info(f"[TEST AUTH] User email: {getattr(request.user, 'email', 'No email')}")
    logger.info(f"[TEST AUTH] User authenticated: {request.user.is_authenticated}")
    logger.info(f"[TEST AUTH] Request headers: {dict(request.headers)}")
    logger.info(f"[TEST AUTH] Request cookies: {request.COOKIES}")
    
    return Response({
        'success': True,
        'message': 'Authentication is working',
        'user': str(request.user),
        'authenticated': request.user.is_authenticated
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_currency_list_view(request):
    """Get list of all available currencies"""
    try:
        currencies = get_currency_list()
        return Response({
            'success': True,
            'currencies': currencies,
            'total': len(currencies)
        })
    except Exception as e:
        logger.error(f"Error fetching currency list: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to fetch currency list'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def get_currency_preferences(request):
    """Get or update business currency preferences"""
    logger.info(f"[Currency API] ========== REQUEST START ==========")
    logger.info(f"[Currency API] Request method: {request.method}")
    logger.info(f"[Currency API] Request path: {request.path}")
    logger.info(f"[Currency API] Request headers: {dict(request.headers)}")
    logger.info(f"[Currency API] Request cookies: {request.COOKIES}")
    logger.info(f"[Currency API] User: {request.user}")
    logger.info(f"[Currency API] User authenticated: {request.user.is_authenticated}")
    
    if request.method == 'PUT':
        logger.info(f"[Currency API] Request data: {request.data}")
        logger.info(f"[Currency API] Request body: {request.body}")
    
    try:
        user = request.user
        logger.info(f"[Currency API] User ID: {user.id}, Email: {user.email}")
        logger.info(f"[Currency API] User type: {type(user)}")
        logger.info(f"[Currency API] User class: {user.__class__.__name__}")
        
        # Try different ways to get the business
        business = None
        business_id = None
        
        # Method 1: Check if user has business_id directly
        if hasattr(user, 'business_id') and user.business_id:
            business_id = user.business_id
            logger.info(f"[Currency API] Found business_id on user: {business_id}")
        
        # Method 2: Check if user has tenant_id (might be the same as business_id)
        elif hasattr(user, 'tenant_id') and user.tenant_id:
            business_id = user.tenant_id
            logger.info(f"[Currency API] Using tenant_id as business_id: {business_id}")
        
        # Method 3: Try to get profile
        else:
            try:
                profile = UserProfile.objects.filter(user=user).first()
                if profile and profile.business_id:
                    business_id = profile.business_id
                    logger.info(f"[Currency API] Found business_id via UserProfile query: {business_id}")
                else:
                    logger.error(f"[Currency API] No profile found for user {user.email}")
            except Exception as e:
                logger.error(f"[Currency API] Error getting profile: {e}")
        
        if not business_id:
            logger.error(f"[Currency API] No business_id found for user {user.email}")
            return Response({
                'success': False,
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get business using the business_id
        try:
            business = Business.objects.get(id=business_id)
            logger.info(f"[Currency API] Business found: {business.name} (ID: {business.id})")
        except Business.DoesNotExist:
            logger.error(f"[Currency API] Business with ID {business_id} not found")
            return Response({
                'success': False,
                'error': 'Business not found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not business:
            return Response({
                'success': False,
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create business details
        try:
            business_details, created = BusinessDetails.objects.get_or_create(
                business=business,
                defaults={
                    'preferred_currency_code': 'USD',
                    'preferred_currency_name': 'US Dollar',
                    'show_usd_on_invoices': True,
                    'show_usd_on_quotes': True,
                    'show_usd_on_reports': False,
                }
            )
            logger.info(f"[Currency API] BusinessDetails found/created: {business_details.id}, created: {created}")
        except Exception as bd_error:
            logger.error(f"[Currency API] BusinessDetails creation error: {str(bd_error)}", exc_info=True)
            return Response({
                'success': False,
                'error': f'Business details error: {str(bd_error)}',
                'error_type': type(bd_error).__name__
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Handle PUT request for updates
        if request.method == 'PUT':
            logger.info(f"[Currency API] ========== PROCESSING PUT REQUEST ==========")
            logger.info(f"[Currency API] Raw request data: {request.data}")
            logger.info(f"[Currency API] Data type: {type(request.data)}")
            logger.info(f"[Currency API] Data keys: {list(request.data.keys()) if hasattr(request.data, 'keys') else 'N/A'}")
            
            # Check if user is owner or admin
            # The User model has a role field directly
            logger.info(f"[Currency API] Checking user role...")
            logger.info(f"[Currency API] Has role attr: {hasattr(user, 'role')}")
            if hasattr(user, 'role'):
                logger.info(f"[Currency API] User role: {user.role}")
            
            if hasattr(user, 'role') and user.role not in ['OWNER', 'ADMIN']:
                logger.error(f"[Currency API] User {user.email} role {user.role} not authorized")
                return Response({
                    'success': False,
                    'error': 'Only business owners and admins can update currency preferences'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Update currency if provided
            currency_code = request.data.get('currency_code')
            logger.info(f"[Currency API] Currency code to update: {currency_code}")
            
            if currency_code:
                try:
                    # Use validator for proper validation
                    validated_currency = CurrencyValidator.validate_currency_update(user, currency_code)
                    currency_info = get_currency_info(validated_currency)
                    logger.info(f"[Currency API] Currency validated and info found: {currency_info}")
                    
                    business_details.preferred_currency_code = validated_currency
                    business_details.preferred_currency_name = currency_info['name']
                    business_details.currency_updated_at = timezone.now()
                    logger.info(f"[Currency API] Updated currency to {validated_currency}")
                    
                except ValidationError as val_error:
                    logger.error(f"[Currency API] Currency validation error: {str(val_error)}", exc_info=True)
                    return Response({
                        'success': False,
                        'error': str(val_error),
                        'error_type': 'ValidationError'
                    }, status=status.HTTP_400_BAD_REQUEST)
                except Exception as curr_error:
                    logger.error(f"[Currency API] Currency update error: {str(curr_error)}", exc_info=True)
                    return Response({
                        'success': False,
                        'error': f'Currency update error: {str(curr_error)}',
                        'error_type': type(curr_error).__name__
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Update toggle preferences
            if 'show_usd_on_invoices' in request.data:
                business_details.show_usd_on_invoices = request.data['show_usd_on_invoices']
            
            if 'show_usd_on_quotes' in request.data:
                business_details.show_usd_on_quotes = request.data['show_usd_on_quotes']
            
            if 'show_usd_on_reports' in request.data:
                business_details.show_usd_on_reports = request.data['show_usd_on_reports']
            
            # Save changes
            try:
                with transaction.atomic():
                    business_details.save()
                    logger.info(f"[Currency API] Saved business details successfully")
            except Exception as save_error:
                logger.error(f"[Currency API] Database save error: {str(save_error)}", exc_info=True)
                return Response({
                    'success': False,
                    'error': f'Database save error: {str(save_error)}',
                    'error_type': type(save_error).__name__
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Get currency info for response
        currency_info = get_currency_info(business_details.preferred_currency_code)
        logger.info(f"[Currency API] Preparing response with currency: {business_details.preferred_currency_code}")
        
        response_data = {
            'success': True,
            'preferences': {
                'currency_code': business_details.preferred_currency_code,
                'currency_name': business_details.preferred_currency_name,
                'currency_symbol': currency_info.get('symbol', '$'),
                'decimal_places': currency_info.get('decimal_places', 2),
                'show_usd_on_invoices': business_details.show_usd_on_invoices,
                'show_usd_on_quotes': business_details.show_usd_on_quotes,
                'show_usd_on_reports': business_details.show_usd_on_reports,
                'last_updated': business_details.currency_updated_at
            }
        }
        
        logger.info(f"[Currency API] ========== RESPONSE SUCCESS ==========")
        logger.info(f"[Currency API] Response data: {response_data}")
        return Response(response_data)
        
    except AttributeError as e:
        logger.error(f"[Currency API] ========== ATTRIBUTE ERROR ==========")
        logger.error(f"[Currency API] AttributeError: {str(e)}", exc_info=True)
        logger.error(f"[Currency API] User object type: {type(request.user)}")
        logger.error(f"[Currency API] User attributes: {[attr for attr in dir(request.user) if not attr.startswith('_')]}")
        
        # Try to get more details about the user model
        try:
            logger.error(f"[Currency API] User model: {request.user.__class__.__name__}")
            logger.error(f"[Currency API] User model module: {request.user.__class__.__module__}")
            if hasattr(request.user, 'profile'):
                logger.error(f"[Currency API] Profile type: {type(request.user.profile)}")
                logger.error(f"[Currency API] Profile attrs: {[attr for attr in dir(request.user.profile) if not attr.startswith('_')]}")
        except Exception as debug_e:
            logger.error(f"[Currency API] Debug error: {debug_e}")
        
        error_response = {
            'success': False,
            'error': f'Profile access error: {str(e)}',
            'error_type': type(e).__name__,
            'debug_info': str(e) if hasattr(e, '__str__') else 'No debug info available'
        }
        logger.error(f"[Currency API] Error response: {error_response}")
        return Response(error_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"[Currency API] ========== UNEXPECTED ERROR ==========")
        logger.error(f"[Currency API] Unexpected error: {str(e)}", exc_info=True)
        logger.error(f"[Currency API] Error type: {type(e).__name__}")
        
        error_response = {
            'success': False,
            'error': f'Server error: {str(e)}',
            'error_type': type(e).__name__,
            'debug_info': str(e) if hasattr(e, '__str__') else 'No debug info available'
        }
        logger.error(f"[Currency API] Error response: {error_response}")
        return Response(error_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_currency_preferences(request):
    """Update business currency preferences"""
    try:
        user = request.user
        # Get business_id using the same approach as above
        business_id = None
        
        if hasattr(user, 'business_id') and user.business_id:
            business_id = user.business_id
        elif hasattr(user, 'tenant_id') and user.tenant_id:
            business_id = user.tenant_id
        else:
            profile = UserProfile.objects.filter(user=user).first()
            if profile and profile.business_id:
                business_id = profile.business_id
        
        if not business_id:
            return Response({
                'success': False,
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        business = Business.objects.get(id=business_id)
        
        if not business:
            return Response({
                'success': False,
                'error': 'No business associated with user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user is owner or admin
        # The User model has a role field directly
        if hasattr(user, 'role') and user.role not in ['OWNER', 'ADMIN']:
            return Response({
                'success': False,
                'error': 'Only business owners and admins can update currency preferences'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get business details
        business_details, created = BusinessDetails.objects.get_or_create(
            business=business,
            defaults={
                'preferred_currency_code': 'USD',
                'preferred_currency_name': 'US Dollar',
            }
        )
        
        # Update currency if provided
        currency_code = request.data.get('currency_code')
        if currency_code:
            currency_info = get_currency_info(currency_code)
            if not currency_info:
                return Response({
                    'success': False,
                    'error': 'Invalid currency code'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            business_details.preferred_currency_code = currency_code
            business_details.preferred_currency_name = currency_info['name']
            business_details.currency_updated_at = timezone.now()
        
        # Update toggle preferences
        if 'show_usd_on_invoices' in request.data:
            business_details.show_usd_on_invoices = request.data['show_usd_on_invoices']
        
        if 'show_usd_on_quotes' in request.data:
            business_details.show_usd_on_quotes = request.data['show_usd_on_quotes']
        
        if 'show_usd_on_reports' in request.data:
            business_details.show_usd_on_reports = request.data['show_usd_on_reports']
        
        # Save changes
        business_details.save()
        
        # Get updated currency info
        currency_info = get_currency_info(business_details.preferred_currency_code)
        
        return Response({
            'success': True,
            'message': 'Currency preferences updated successfully',
            'preferences': {
                'currency_code': business_details.preferred_currency_code,
                'currency_name': business_details.preferred_currency_name,
                'currency_symbol': currency_info.get('symbol', '$'),
                'decimal_places': currency_info.get('decimal_places', 2),
                'show_usd_on_invoices': business_details.show_usd_on_invoices,
                'show_usd_on_quotes': business_details.show_usd_on_quotes,
                'show_usd_on_reports': business_details.show_usd_on_reports,
                'last_updated': business_details.currency_updated_at
            }
        })
        
    except Exception as e:
        logger.error(f"Error updating currency preferences: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Failed to update currency preferences'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_exchange_rate(request):
    """Get exchange rate for currency conversion"""
    logger.info(f"[Exchange Rate API] Request data: {request.data}")
    logger.info(f"[Exchange Rate API] User: {request.user.email if request.user.is_authenticated else 'Not authenticated'}")
    
    try:
        from_currency = request.data.get('from_currency', 'USD')
        to_currency = request.data.get('to_currency', 'USD')
        amount = request.data.get('amount', 1)
        
        # Validate request using validator
        try:
            from_currency, to_currency, amount = CurrencyValidator.validate_exchange_rate_request(
                from_currency, to_currency, amount
            )
            logger.info(f"[Exchange Rate API] Validated: Converting {amount} from {from_currency} to {to_currency}")
        except ValidationError as val_error:
            logger.error(f"[Exchange Rate API] Validation error: {str(val_error)}")
            return Response({
                'success': False,
                'error': str(val_error)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get exchange rate
        converted_amount, metadata = exchange_rate_service.convert_amount(
            amount, from_currency, to_currency
        )
        
        if converted_amount is None:
            return Response({
                'success': False,
                'error': 'Unable to fetch exchange rate'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        return Response({
            'success': True,
            'exchange_rate': {
                'from_currency': from_currency,
                'to_currency': to_currency,
                'rate': metadata.get('exchange_rate'),
                'original_amount': str(amount),
                'converted_amount': str(converted_amount),
                'source': metadata.get('source'),
                'timestamp': metadata.get('timestamp'),
                'is_outdated': exchange_rate_service.is_rate_outdated(
                    metadata.get('timestamp'), from_currency
                )
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching exchange rate: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Failed to fetch exchange rate'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)