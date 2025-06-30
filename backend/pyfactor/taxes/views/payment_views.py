# taxes/views/payment_views.py
"""
Payment-related views for tax filing system
"""
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.urls import reverse
from django.conf import settings

from taxes.models import TaxFiling
from taxes.payment_integration import (
    create_tax_filing_checkout_session,
    get_pricing_for_tax_filing,
    validate_checkout_session,
    cancel_checkout_session
)
from custom_auth.rls_middleware import with_tenant_context

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@with_tenant_context
def create_payment_session(request):
    """
    Create a Stripe checkout session for tax filing payment
    
    Expected request data:
    {
        "filing_id": "uuid",
        "success_url": "https://dottapps.com/taxes/payment-success",
        "cancel_url": "https://dottapps.com/taxes/payment-cancel"
    }
    """
    try:
        filing_id = request.data.get('filing_id')
        success_url = request.data.get('success_url')
        cancel_url = request.data.get('cancel_url')
        
        # Validate required fields
        if not all([filing_id, success_url, cancel_url]):
            return Response({
                'error': 'Missing required fields: filing_id, success_url, cancel_url'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the filing
        try:
            filing = TaxFiling.objects.get(
                filing_id=filing_id,
                tenant_id=request.tenant_id
            )
        except TaxFiling.DoesNotExist:
            return Response({
                'error': 'Tax filing not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if payment is already completed
        if filing.payment_status == 'completed':
            return Response({
                'error': 'Payment already completed for this filing'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if filing can accept payment
        if filing.status not in ['payment_pending', 'payment_completed']:
            return Response({
                'error': f'Filing is in {filing.status} status and cannot accept payment'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create checkout session
        result = create_tax_filing_checkout_session(
            filing,
            success_url,
            cancel_url
        )
        
        if result['success']:
            # Update filing with session ID
            filing.payment_session_id = result['session_id']
            filing.save()
            
            return Response({
                'checkout_url': result['checkout_url'],
                'session_id': result['session_id']
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': result.get('error', 'Failed to create payment session'),
                'error_code': result.get('error_code', 'unknown')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Error creating payment session: {str(e)}", exc_info=True)
        return Response({
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@with_tenant_context
def get_filing_pricing(request):
    """
    Get pricing for a tax filing based on type and complexity
    
    Query parameters:
    - tax_type: sales, payroll, or income
    - service_type: fullService or selfService
    - locations: number of locations (for sales tax)
    - employee_count: number of employees (for payroll tax)
    - annual_revenue: annual revenue (for income tax)
    """
    try:
        tax_type = request.GET.get('tax_type')
        service_type = request.GET.get('service_type')
        
        if not all([tax_type, service_type]):
            return Response({
                'error': 'Missing required parameters: tax_type, service_type'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Build filing data from query parameters
        filing_data = {}
        
        if tax_type == 'sales':
            locations = request.GET.get('locations', '1')
            try:
                filing_data['locations'] = ['location'] * int(locations)
            except ValueError:
                filing_data['locations'] = ['location']
                
            total_sales = request.GET.get('total_sales', '0')
            try:
                filing_data['total_sales'] = float(total_sales)
            except ValueError:
                filing_data['total_sales'] = 0
                
        elif tax_type == 'payroll':
            employee_count = request.GET.get('employee_count', '0')
            try:
                filing_data['employee_count'] = int(employee_count)
            except ValueError:
                filing_data['employee_count'] = 0
                
            states = request.GET.getlist('states', [])
            filing_data['states'] = states if states else ['default']
            
        elif tax_type == 'income':
            filing_data['business_structure'] = request.GET.get('business_structure', 'sole-prop')
            
            annual_revenue = request.GET.get('annual_revenue', '0')
            try:
                filing_data['annual_revenue'] = float(annual_revenue)
            except ValueError:
                filing_data['annual_revenue'] = 0
        
        # Get pricing
        pricing = get_pricing_for_tax_filing(tax_type, service_type, filing_data)
        
        return Response(pricing, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting filing pricing: {str(e)}", exc_info=True)
        return Response({
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@with_tenant_context
def validate_payment_session(request):
    """
    Validate a Stripe checkout session
    
    Expected request data:
    {
        "session_id": "cs_test_..."
    }
    """
    try:
        session_id = request.data.get('session_id')
        
        if not session_id:
            return Response({
                'error': 'Missing required field: session_id'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        result = validate_checkout_session(session_id)
        
        if result['is_valid']:
            return Response({
                'is_valid': True,
                'session': result['session']
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'is_valid': False,
                'error': result.get('error', 'Invalid session')
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error validating payment session: {str(e)}", exc_info=True)
        return Response({
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@with_tenant_context
def cancel_payment_session(request):
    """
    Cancel a Stripe checkout session
    
    Expected request data:
    {
        "filing_id": "uuid"
    }
    """
    try:
        filing_id = request.data.get('filing_id')
        
        if not filing_id:
            return Response({
                'error': 'Missing required field: filing_id'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the filing
        try:
            filing = TaxFiling.objects.get(
                filing_id=filing_id,
                tenant_id=request.tenant_id
            )
        except TaxFiling.DoesNotExist:
            return Response({
                'error': 'Tax filing not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if there's a session to cancel
        if not filing.payment_session_id:
            return Response({
                'error': 'No payment session found for this filing'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Cancel the session
        result = cancel_checkout_session(filing.payment_session_id)
        
        if result['success']:
            # Clear session ID from filing
            filing.payment_session_id = None
            filing.save()
            
            return Response({
                'message': 'Payment session cancelled successfully'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': result.get('error', 'Failed to cancel session')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Error cancelling payment session: {str(e)}", exc_info=True)
        return Response({
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)