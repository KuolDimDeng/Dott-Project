"""
API views for business settings including accounting standards
"""
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from users.models import Business, BusinessDetails, UserProfile
from users.accounting_standards import (
    get_default_accounting_standard, 
    get_accounting_standard_display,
    is_dual_standard_country,
    ACCOUNTING_STANDARD_INFO
)

logger = logging.getLogger(__name__)

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def business_settings(request):
    """Get or update business settings including accounting standard"""
    try:
        user = request.user
        
        # Get business_id
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
        business_details, created = BusinessDetails.objects.get_or_create(business=business)
        
        if request.method == 'GET':
            # Get accounting standard info
            country_code = str(business_details.country) if business_details.country else 'US'
            
            return Response({
                'success': True,
                'business': {
                    'name': business.name,
                    'country': country_code,
                    'country_name': business_details.country.name if business_details.country else 'United States',
                    'accounting_standard': business_details.accounting_standard or get_default_accounting_standard(country_code),
                    'accounting_standard_display': get_accounting_standard_display(
                        business_details.accounting_standard or get_default_accounting_standard(country_code),
                        country_code
                    ),
                    'allows_dual_standard': is_dual_standard_country(country_code),
                    'default_standard': get_default_accounting_standard(country_code),
                    'standard_info': ACCOUNTING_STANDARD_INFO.get(
                        business_details.accounting_standard or get_default_accounting_standard(country_code)
                    )
                }
            })
        
        elif request.method == 'PATCH':
            # Update accounting standard
            if 'accounting_standard' in request.data:
                new_standard = request.data['accounting_standard']
                if new_standard in ['IFRS', 'GAAP']:
                    old_standard = business_details.accounting_standard
                    business_details.accounting_standard = new_standard
                    business_details.accounting_standard_updated_at = timezone.now()
                    business_details.save()
                    
                    logger.info(f"Accounting standard changed from {old_standard} to {new_standard} for business {business.id}")
                    
                    return Response({
                        'success': True,
                        'message': f'Accounting standard updated to {new_standard}',
                        'accounting_standard': new_standard,
                        'accounting_standard_display': get_accounting_standard_display(new_standard, business_details.country)
                    })
                else:
                    return Response({
                        'success': False,
                        'error': 'Invalid accounting standard. Must be IFRS or GAAP'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'success': False,
                'error': 'No valid fields to update'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except Business.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Business not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in business settings: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def accounting_standards_info(request):
    """Get information about available accounting standards"""
    return Response({
        'success': True,
        'standards': ACCOUNTING_STANDARD_INFO,
        'user_country': str(request.user.business.details.country) if hasattr(request.user, 'business') else None,
        'recommended_standard': get_default_accounting_standard(
            str(request.user.business.details.country) if hasattr(request.user, 'business') else 'US'
        )
    })