# payments/views.py
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .providers import PaymentProviderRegistry
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from hr.models import Employee
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
import json
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def country_payment_providers(request, country_code):
    """Get available payment providers for a country"""
    try:
        # Get available providers for this country
        country_providers = PaymentProviderRegistry.COUNTRY_PROVIDER_MAP.get(
            country_code,
            PaymentProviderRegistry.COUNTRY_PROVIDER_MAP['default']
        )
        
        # Format response data
        providers = []
        for key, provider_name in country_providers.items():
            if key != 'default':
                providers.append({
                    'id': provider_name,
                    'name': provider_name.replace('_', ' ').title(),
                    'type': key
                })
                
        return Response({
            'providers': providers,
            'primary_provider': country_providers.get('primary')
        })
    except Exception as e:
        logger.error(f"Error getting country payment providers: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def provider_form(request, provider_name):
    """Get form fields for a specific payment provider"""
    try:
        provider = PaymentProviderRegistry.get_provider_by_name(provider_name)
        fields = provider.get_employee_account_form()
        
        return Response({'fields': fields})
    except Exception as e:
        logger.error(f"Error getting provider form for {provider_name}: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def employee_payment_method(request, employee_id):
    """
    Get or set payment method information for an employee.
    
    Args:
        request: HTTP request object
        employee_id: UUID of the employee
        
    Returns:
        For GET requests: Payment method information for the employee
        For POST requests: Success message or error details
        
    Raises:
        HTTP 404: If employee not found
        HTTP 403: If employee doesn't belong to user's company
        HTTP 400: If required payment details are missing
        HTTP 500: If storing payment details fails
    """
    # Get the employee or return 404
    employee = get_object_or_404(Employee, id=employee_id)
    
    # Verify the employee belongs to the user's company
    if request.user.business_id and employee.business_id != request.user.business_id:
        return Response({
            'error': 'You do not have permission to manage this employee\'s payment method'
        }, status=status.HTTP_403_FORBIDDEN)
        
    # Handle GET request
    if request.method == 'GET':
        payment_info = {
            'provider': employee.payment_provider,
        }
        
        # Include provider-specific details
        if employee.payment_provider:
            if employee.payment_provider == 'mpesa':
                payment_info['mpesa_phone_number'] = employee.mpesa_phone_number
            elif employee.payment_provider == 'paypal':
                payment_info['paypal_email'] = employee.paypal_email
            elif employee.payment_provider in ['bank', 'stripe', 'wise']:
                payment_info['bank_name'] = employee.bank_name
                payment_info['bank_account_last_four'] = employee.bank_account_last_four
                payment_info['bank_account_stored_in_stripe'] = employee.bank_account_stored_in_stripe
            elif employee.payment_provider in ['mobile_money', 'orange_money', 'mtn_money']:
                payment_info['mobile_wallet_provider'] = employee.mobile_wallet_provider
                payment_info['mobile_wallet_id'] = employee.mobile_wallet_id
        
        return Response(payment_info)
    
    # Handle POST request
    elif request.method == 'POST':
        data = request.data
        provider_name = data.get('provider')
        
        if not provider_name:
            return Response({
                'error': 'Payment provider is required'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # Get provider details and validate
        try:
            provider = PaymentProviderRegistry.get_provider_by_name(provider_name)
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # Validate and process provider-specific details
        if provider_name == 'mpesa':
            phone_number = data.get('phone_number')
            if not phone_number:
                return Response({
                    'error': 'Phone number is required for M-Pesa payments'
                }, status=status.HTTP_400_BAD_REQUEST)
            employee.mpesa_phone_number = phone_number
            
        elif provider_name == 'paypal':
            email = data.get('email')
            if not email:
                return Response({
                    'error': 'Email is required for PayPal payments'
                }, status=status.HTTP_400_BAD_REQUEST)
            employee.paypal_email = email
            
        elif provider_name in ['bank', 'stripe', 'wise']:
            # Use Stripe for secure storage
            account_number = data.get('account_number')
            routing_number = data.get('routing_number')
            bank_name = data.get('bank_name')
            
            if not all([account_number, routing_number, bank_name]):
                return Response({
                    'error': 'Bank account details are incomplete'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            try:
                # Store securely in Stripe
                success = employee.save_bank_account_to_stripe(account_number, routing_number)
                if not success:
                    raise ValueError("Failed to store bank details in Stripe")
                
                # Only store bank name locally
                employee.bank_name = bank_name
            except Exception as e:
                logger.error(f"Failed to store bank details for employee {employee_id}: {str(e)}")
                return Response({
                    'error': f'Failed to store bank details: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        elif provider_name in ['mobile_money', 'orange_money', 'mtn_money']:
            wallet_id = data.get('wallet_id')
            if not wallet_id:
                return Response({
                    'error': 'Mobile wallet ID is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            employee.mobile_wallet_provider = provider_name
            employee.mobile_wallet_id = wallet_id
        else:
            # Handle other or unknown providers
            logger.warning(f"Unhandled payment provider type: {provider_name}")
            return Response({
                'error': f'Payment provider {provider_name} is not fully supported yet'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Save the provider and common fields
        employee.payment_provider = provider_name
        employee.save()
        
        return Response({
            'success': True,
            'message': f'Payment method updated to {provider_name}'
        })