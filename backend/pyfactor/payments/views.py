
# payments/views.py
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .providers import PaymentProviderRegistry

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
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def employee_payment_method(request, employee_id):
    """Set payment method for an employee"""
    from hr.models import Employee
    
    try:
        employee = Employee.objects.get(id=employee_id)
        
        # Ensure the employee belongs to the user's company
        if str(employee.business_id) != str(request.user.business_id):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
            
        provider_name = request.data.get('provider')
        details = request.data.get('details', {})
        
        # Validate the provider
        provider = PaymentProviderRegistry.get_provider_by_name(provider_name)
        
        # Validate account details
        valid, message = provider.validate_account_details(details)
        if not valid:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
            
        # Update employee record with provider-specific fields
        employee.payment_provider = provider_name
        
        # Handle provider-specific fields
        if provider_name == 'stripe':
            if 'account_number' in details:
                employee.bank_account_last_four = details['account_number'][-4:]
            if 'account_holder_name' in details:
                employee.bank_name = details.get('bank_name', 'Bank Account')
        elif provider_name == 'mpesa':
            if 'mpesa_phone_number' in details:
                employee.mpesa_phone_number = details['mpesa_phone_number']
                employee.mobile_wallet_provider = 'M-Pesa'
                employee.mobile_wallet_id = details['mpesa_phone_number']
        elif provider_name == 'paypal':
            if 'paypal_email' in details:
                employee.paypal_email = details['paypal_email']
        
        employee.save()
        
        return Response({'success': True, 'message': 'Payment method updated successfully'})
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)