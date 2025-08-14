#!/usr/bin/env python
"""
Test POS API endpoint directly
"""
import os
import sys
import django
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from sales.pos_viewsets import POSTransactionViewSet
from rest_framework.test import force_authenticate

def test_pos_api():
    """Test POS API endpoint"""
    print("=== Testing POS API Endpoint ===\n")
    
    # Get a user for authentication
    User = get_user_model()
    user = User.objects.first()
    
    if not user:
        print("No users found in database")
        return
    
    print(f"Testing with user: {user.email}\n")
    
    # Create a request
    factory = RequestFactory()
    request = factory.get('/api/sales/pos/transactions/')
    
    # Authenticate the request
    force_authenticate(request, user=user)
    
    # Create viewset and get response
    viewset = POSTransactionViewSet()
    viewset.request = request
    viewset.format_kwarg = None
    
    # Get the list response
    response = viewset.list(request)
    
    print("API Response:")
    print("-" * 50)
    
    if hasattr(response, 'data'):
        data = response.data
        print(f"Response keys: {list(data.keys())}")
        
        if 'results' in data:
            print(f"Number of results: {len(data['results'])}")
            
            if data['results']:
                first_transaction = data['results'][0]
                print(f"\nFirst transaction data:")
                print(f"  - Keys: {list(first_transaction.keys())}")
                print(f"  - transaction_number: {first_transaction.get('transaction_number')}")
                print(f"  - currency_code: {first_transaction.get('currency_code')}")
                print(f"  - currency_symbol: {first_transaction.get('currency_symbol')}")
                print(f"  - total_amount: {first_transaction.get('total_amount')}")
                
                print(f"\nFull first transaction:")
                print(json.dumps(first_transaction, indent=2, default=str))
        else:
            print("No 'results' key in response")
            print(f"Full response: {json.dumps(data, indent=2, default=str)}")

if __name__ == "__main__":
    test_pos_api()