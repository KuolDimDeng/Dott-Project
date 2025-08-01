"""
Debug endpoint to trace 500 error in currency API
"""
import logging
import traceback
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_currency_500(request):
    """Step-by-step debug of currency API to find 500 error source"""
    debug_info = {
        'steps': [],
        'error': None,
        'success': False
    }
    
    try:
        # Step 1: Basic request info
        debug_info['steps'].append({
            'step': 1,
            'name': 'Request info',
            'success': True,
            'data': {
                'user': str(request.user),
                'user_id': str(request.user.id),
                'authenticated': request.user.is_authenticated,
            }
        })
        
        # Step 2: Import models
        try:
            from users.models import UserProfile, Business, BusinessDetails
            debug_info['steps'].append({
                'step': 2,
                'name': 'Import models',
                'success': True
            })
        except Exception as e:
            debug_info['steps'].append({
                'step': 2,
                'name': 'Import models',
                'success': False,
                'error': str(e)
            })
            raise
        
        # Step 3: Get business_id
        business_id = None
        try:
            user = request.user
            if hasattr(user, 'business_id') and user.business_id:
                business_id = user.business_id
                debug_info['steps'].append({
                    'step': 3,
                    'name': 'Get business_id from user',
                    'success': True,
                    'business_id': str(business_id)
                })
            elif hasattr(user, 'tenant_id') and user.tenant_id:
                business_id = user.tenant_id
                debug_info['steps'].append({
                    'step': 3,
                    'name': 'Get business_id from tenant_id',
                    'success': True,
                    'business_id': str(business_id)
                })
            else:
                # Try UserProfile
                profile = UserProfile.objects.filter(user=user).first()
                if profile and profile.business_id:
                    business_id = profile.business_id
                    debug_info['steps'].append({
                        'step': 3,
                        'name': 'Get business_id from UserProfile',
                        'success': True,
                        'business_id': str(business_id),
                        'profile_exists': True
                    })
                else:
                    debug_info['steps'].append({
                        'step': 3,
                        'name': 'Get business_id',
                        'success': False,
                        'error': 'No business_id found',
                        'profile_exists': profile is not None
                    })
        except Exception as e:
            debug_info['steps'].append({
                'step': 3,
                'name': 'Get business_id',
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc()
            })
            raise
        
        # Step 4: Get Business
        if business_id:
            try:
                business = Business.objects.get(id=business_id)
                debug_info['steps'].append({
                    'step': 4,
                    'name': 'Get Business',
                    'success': True,
                    'business_name': business.name
                })
            except Business.DoesNotExist:
                debug_info['steps'].append({
                    'step': 4,
                    'name': 'Get Business',
                    'success': False,
                    'error': f'Business {business_id} not found'
                })
                business = None
            except Exception as e:
                debug_info['steps'].append({
                    'step': 4,
                    'name': 'Get Business',
                    'success': False,
                    'error': str(e),
                    'traceback': traceback.format_exc()
                })
                raise
        
        # Step 5: Get/Create BusinessDetails
        if business:
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
                debug_info['steps'].append({
                    'step': 5,
                    'name': 'Get/Create BusinessDetails',
                    'success': True,
                    'created': created,
                    'currency': business_details.preferred_currency_code
                })
            except Exception as e:
                debug_info['steps'].append({
                    'step': 5,
                    'name': 'Get/Create BusinessDetails',
                    'success': False,
                    'error': str(e),
                    'traceback': traceback.format_exc()
                })
                raise
        
        # Step 6: Import currency_data
        try:
            from currency.currency_data import get_currency_info
            currency_info = get_currency_info('USD')
            debug_info['steps'].append({
                'step': 6,
                'name': 'Import currency_data',
                'success': True,
                'test_currency': currency_info is not None
            })
        except Exception as e:
            debug_info['steps'].append({
                'step': 6,
                'name': 'Import currency_data',
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc()
            })
        
        # Step 7: Import accounting_standards
        try:
            from users.accounting_standards import get_accounting_standard_display, is_dual_standard_country
            debug_info['steps'].append({
                'step': 7,
                'name': 'Import accounting_standards',
                'success': True
            })
        except Exception as e:
            debug_info['steps'].append({
                'step': 7,
                'name': 'Import accounting_standards',
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc()
            })
        
        # Step 8: Import cache service
        try:
            from core.cache_service import cache_service
            debug_info['steps'].append({
                'step': 8,
                'name': 'Import cache_service',
                'success': True
            })
        except Exception as e:
            debug_info['steps'].append({
                'step': 8,
                'name': 'Import cache_service',
                'success': False,
                'error': str(e),
                'note': 'This is OK - cache is optional'
            })
        
        debug_info['success'] = True
        debug_info['message'] = 'All steps completed successfully'
        
    except Exception as e:
        debug_info['error'] = str(e)
        debug_info['error_type'] = type(e).__name__
        debug_info['traceback'] = traceback.format_exc()
        
        return Response(debug_info, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response(debug_info)