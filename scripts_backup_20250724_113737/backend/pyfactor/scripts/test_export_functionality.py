#!/usr/bin/env python
"""
Test script for data export functionality
Usage: python test_export_functionality.py
"""

import os
import sys
import django
import json
import requests
from datetime import datetime

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from custom_auth.models import UserProfile
from products.models import Product
from customers.models import Customer
from session_manager.models import SessionModel

User = get_user_model()

def test_export():
    """Test the export functionality"""
    print("Testing Data Export Functionality")
    print("=" * 50)
    
    # Get a test user
    try:
        user = User.objects.filter(userprofile__role__in=['OWNER', 'ADMIN']).first()
        if not user:
            print("❌ No OWNER or ADMIN users found in database")
            return
            
        profile = user.userprofile
        print(f"✅ Found user: {user.email} (Role: {profile.role})")
        print(f"   Tenant ID: {profile.tenant_id}")
        
        # Check if user has any data to export
        product_count = Product.objects.filter(tenant_id=profile.tenant_id).count()
        customer_count = Customer.objects.filter(tenant_id=profile.tenant_id).count()
        
        print(f"\n📊 Data available for export:")
        print(f"   Products: {product_count}")
        print(f"   Customers: {customer_count}")
        
        # Get or create a session for the user
        session = SessionModel.objects.filter(user=user, is_active=True).first()
        if session:
            print(f"\n🔑 Using existing session: {session.session_key}")
        else:
            print("❌ No active session found for user")
            print("   Please ensure the user has an active session")
            return
        
        # Test the export endpoint
        print("\n🚀 Testing export endpoint...")
        
        # Build the request
        url = "http://localhost:8000/api/data-export/export/"
        headers = {
            'Content-Type': 'application/json',
            'Cookie': f'session_token={session.session_key}'
        }
        
        data = {
            'dataTypes': ['products', 'customers'],
            'format': 'excel',
            'dateRange': 'all'
        }
        
        print(f"   URL: {url}")
        print(f"   Data types: {data['dataTypes']}")
        print(f"   Format: {data['format']}")
        
        try:
            response = requests.post(url, json=data, headers=headers)
            
            if response.status_code == 200:
                print(f"\n✅ Export successful!")
                print(f"   Content-Type: {response.headers.get('Content-Type')}")
                print(f"   Content-Length: {len(response.content)} bytes")
                
                # Save the file for inspection
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"test_export_{timestamp}.xlsx"
                with open(filename, 'wb') as f:
                    f.write(response.content)
                print(f"   Saved to: {filename}")
                
            else:
                print(f"\n❌ Export failed!")
                print(f"   Status: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"\n❌ Error testing export: {str(e)}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_export()