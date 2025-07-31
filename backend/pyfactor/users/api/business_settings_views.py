"""
API views for business settings including accounting standards
"""
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from users.models import Business, BusinessDetails, UserProfile
from users.accounting_standards import (
    get_default_accounting_standard, 
    get_accounting_standard_display,
    is_dual_standard_country,
    ACCOUNTING_STANDARD_INFO
)

logger = logging.getLogger(__name__)

class BusinessSettingsView(APIView):
    """Get or update business settings including accounting standard"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get business settings"""
        logger.info(f"[business_settings] GET request, Path: {request.path}")
        logger.info(f"[business_settings] User: {request.user}, Auth: {request.user.is_authenticated}")
        return self._handle_request(request, 'GET')
    
    def patch(self, request):
        """Update business settings"""
        logger.info(f"[business_settings] PATCH request, Path: {request.path}")
        logger.info(f"[business_settings] User: {request.user}, Auth: {request.user.is_authenticated}")
        return self._handle_request(request, 'PATCH')
    
    def _handle_request(self, request, method):
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
            
            if method == 'GET':
                # Get accounting standard info
                from accounting.services import AccountingStandardsService
                country_code = str(business_details.country) if business_details.country else 'US'
                current_standard = business_details.accounting_standard or get_default_accounting_standard(country_code)
            
                # Get financial statement names
                statement_format = AccountingStandardsService.get_financial_statement_format(business_id)
                
                return Response({
                    'success': True,
                    'accounting_standard': current_standard,
                    'accounting_standard_display': get_accounting_standard_display(current_standard, country_code),
                    'country': country_code,
                    'country_name': business_details.country.name if business_details.country else 'United States',
                    'allows_dual_standard': is_dual_standard_country(country_code),
                    'default_standard': get_default_accounting_standard(country_code),
                    'inventory_valuation_method': business_details.inventory_valuation_method or 'WEIGHTED_AVERAGE',
                    'financial_statement_names': {
                        'balance_sheet': statement_format['balance_sheet_name'],
                        'income_statement': statement_format['income_statement_name'],
                        'equity_statement': statement_format['equity_statement_name']
                    },
                    'standard_info': ACCOUNTING_STANDARD_INFO.get(current_standard),
                    'business': {
                        'name': business.name,
                        'id': str(business.id)
                    }
                })
        
            elif method == 'PATCH':
            # Update accounting standard
            updated = False
            response_data = {'success': True}
            
            if 'accounting_standard' in request.data:
                new_standard = request.data['accounting_standard']
                if new_standard in ['IFRS', 'GAAP']:
                    old_standard = business_details.accounting_standard
                    business_details.accounting_standard = new_standard
                    business_details.accounting_standard_updated_at = timezone.now()
                    
                    # If changing from GAAP to IFRS and currently using LIFO, switch to WEIGHTED_AVERAGE
                    if new_standard == 'IFRS' and business_details.inventory_valuation_method == 'LIFO':
                        business_details.inventory_valuation_method = 'WEIGHTED_AVERAGE'
                        response_data['inventory_method_changed'] = True
                        response_data['inventory_valuation_method'] = 'WEIGHTED_AVERAGE'
                    
                    updated = True
                    logger.info(f"Accounting standard changed from {old_standard} to {new_standard} for business {business.id}")
                    response_data['accounting_standard'] = new_standard
                    response_data['accounting_standard_display'] = get_accounting_standard_display(new_standard, str(business_details.country))
                else:
                    return Response({
                        'success': False,
                        'error': 'Invalid accounting standard. Must be IFRS or GAAP'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if 'inventory_valuation_method' in request.data:
                new_method = request.data['inventory_valuation_method']
                valid_methods = ['FIFO', 'WEIGHTED_AVERAGE']
                
                # Only allow LIFO for GAAP
                if business_details.accounting_standard == 'GAAP':
                    valid_methods.append('LIFO')
                
                if new_method in valid_methods:
                    business_details.inventory_valuation_method = new_method
                    updated = True
                    response_data['inventory_valuation_method'] = new_method
                else:
                    return Response({
                        'success': False,
                        'error': f'Invalid inventory method. Valid methods for {business_details.accounting_standard}: {", ".join(valid_methods)}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if updated:
                business_details.save()
                
                # Return full updated data
                country_code = str(business_details.country) if business_details.country else 'US'
                response_data.update({
                    'accounting_standard': business_details.accounting_standard,
                    'accounting_standard_display': get_accounting_standard_display(
                        business_details.accounting_standard,
                        country_code
                    ),
                    'inventory_valuation_method': business_details.inventory_valuation_method,
                    'country': country_code,
                    'allows_dual_standard': is_dual_standard_country(country_code)
                })
                
                return Response(response_data)
            
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