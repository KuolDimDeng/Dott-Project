#!/usr/bin/env python
"""
Version0001_secure_bank_account_storage.py

This script modifies the payment handling mechanism to enhance security by:
1. Using Stripe to store sensitive bank account information
2. Only storing the last 4 digits of account numbers in the database
3. Updating relevant API endpoints to handle this securely

Version: 1.0
Created: 2023-11-08
Author: System Administrator
Issue Reference: SECURITY-001
"""

import os
import sys
import shutil
import datetime
from pathlib import Path

# Add the project root to the path so we can import from it
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

# Import settings to set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.conf import settings

def create_backup(file_path):
    """Create a backup of the specified file with date in the filename."""
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f"{file_path}.backup-{timestamp}"
    shutil.copy2(file_path, backup_path)
    print(f"Created backup: {backup_path}")
    return backup_path

def update_payment_views():
    """Update the payment views.py file to use Stripe for bank account storage."""
    views_path = project_root / 'payments' / 'views.py'
    
    # Create backup before modifying
    create_backup(views_path)
    
    with open(views_path, 'r') as file:
        content = file.read()
    
    # Updated content with Stripe integration for bank account details
    updated_content = """
# payments/views.py
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .providers import PaymentProviderRegistry
import stripe
from django.conf import settings

# Configure Stripe with API key from settings
stripe.api_key = settings.STRIPE_SECRET_KEY

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
            if 'account_number' in details and 'routing_number' in details:
                # Use Stripe to securely store bank account details
                try:
                    employee.save_bank_account_to_stripe(
                        account_number=details['account_number'],
                        routing_number=details['routing_number']
                    )
                    # Bank name is not sensitive, can be stored directly
                    if 'bank_name' in details:
                        employee.bank_name = details.get('bank_name', 'Bank Account')
                except Exception as e:
                    return Response({
                        'error': f'Failed to securely store bank account: {str(e)}'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                # Just update the bank name if no account details are provided
                if 'bank_name' in details:
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
        
        return Response({
            'success': True, 
            'message': 'Payment method updated successfully',
            'secure_storage': provider_name == 'stripe' and employee.bank_account_stored_in_stripe
        })
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
"""
    
    # Write the updated content
    with open(views_path, 'w') as file:
        file.write(updated_content)
    
    print(f"Updated: {views_path}")

def update_script_registry():
    """Update the script registry file to record this script execution."""
    registry_path = project_root / 'scripts' / 'script_registry.md'
    
    # Create the registry file if it doesn't exist
    if not registry_path.exists():
        with open(registry_path, 'w') as file:
            file.write("""# Backend Script Registry

This file tracks the execution of database and codebase modification scripts.

| Script Name | Version | Purpose | Execution Date | Status | Notes |
|-------------|---------|---------|---------------|--------|-------|
""")
    
    # Add this script to the registry
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    script_name = Path(__file__).name
    
    with open(registry_path, 'a') as file:
        file.write(f"| {script_name} | 1.0 | Secure bank account storage using Stripe | {timestamp} | Completed | Modified payments/views.py |\n")
    
    print(f"Updated script registry: {registry_path}")

def create_documentation():
    """Create/update documentation for the changes made."""
    docs_path = project_root / 'payments' / 'SECURITY.md'
    
    # Create or update the documentation file
    with open(docs_path, 'w') as file:
        file.write("""# Payment Security Documentation

## Bank Account Information Security

Version: 1.0
Last Updated: 2023-11-08

### Overview

To ensure the security of sensitive financial information, this system implements the following measures:

1. **No Direct Storage of Sensitive Information**: Complete bank account numbers and routing numbers are never stored directly in our database.

2. **Stripe Integration**: We use Stripe (a PCI-DSS compliant service) to securely store and process financial information.

3. **Tokenization**: Bank account details are tokenized and only references to this data are stored in our system.

4. **Minimal Data Storage**: Only the last 4 digits of account numbers are stored in our database for reference.

### Implementation Details

- When bank account information is submitted through the system, it is immediately sent to Stripe.
- Stripe returns a token that we store instead of the actual account details.
- For display purposes, we store the last 4 digits of account numbers.
- The API prevents full account numbers from being returned to clients.

### Technical Flow

1. User submits bank account information
2. Frontend sends data via HTTPS to our backend API
3. Backend immediately forwards sensitive data to Stripe
4. Stripe returns a token which we store in our database
5. Last 4 digits of account number are stored for display purposes
6. Complete information is purged from memory

### Security Flags

The system maintains security flags to track what information is stored in Stripe:

- `bank_account_stored_in_stripe`: Indicates if bank account information is stored in Stripe

### Related API Endpoints

- `/payments/employees/<employee_id>/payment-method/`: Updates employee payment method using Stripe

""")
    
    print(f"Created/updated documentation: {docs_path}")

def main():
    """Main function to execute the script."""
    print("Starting secure bank account storage implementation...")
    update_payment_views()
    update_script_registry()
    create_documentation()
    print("Implementation completed successfully.")

if __name__ == "__main__":
    main() 