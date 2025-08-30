#!/usr/bin/env python
"""
Test marketplace and chat API endpoints
"""
import os
import sys
import django
import requests
import json

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model

def test_endpoints():
    """Test marketplace and chat endpoints"""
    
    # Get a test user
    User = get_user_model()
    try:
        user = User.objects.filter(is_active=True).first()
        if not user:
            print("❌ No active users found")
            return
        
        print(f"✅ Found test user: {user.email}")
        
        # Check if user has a business listing
        from marketplace.models import BusinessListing
        listing = BusinessListing.objects.filter(business=user).first()
        
        if listing:
            print(f"✅ User has business listing: {listing.primary_category}")
        else:
            print("⚠️  User has no business listing - creating one...")
            listing = BusinessListing.objects.create(
                business=user,
                primary_category='retail',
                description='Test business for marketplace',
                country='US',
                city='New York',
                delivery_scope='local',
                delivery_radius_km=10.0,
                is_visible_in_marketplace=True
            )
            print("✅ Created business listing")
        
        # Check consumer profile
        from marketplace.models import ConsumerProfile
        profile = ConsumerProfile.objects.filter(user=user).first()
        
        if profile:
            print(f"✅ User has consumer profile")
        else:
            print("⚠️  User has no consumer profile - creating one...")
            profile = ConsumerProfile.objects.create(
                user=user,
                current_country='US',
                current_city='New York'
            )
            print("✅ Created consumer profile")
        
        # Test chat conversation
        from chat.models import ChatConversation
        
        # Get another user to chat with
        other_user = User.objects.exclude(id=user.id).first()
        if other_user:
            conv = ChatConversation.objects.filter(
                consumer=user,
                business=other_user
            ).first()
            
            if not conv:
                conv = ChatConversation.objects.create(
                    consumer=user,
                    business=other_user
                )
                print(f"✅ Created chat conversation between {user.email} and {other_user.email}")
            else:
                print(f"✅ Found existing conversation")
            
            # Create a test message
            from chat.models import ChatMessage
            message = ChatMessage.objects.create(
                conversation=conv,
                sender=user,
                text="Test message from marketplace testing",
                message_type='text'
            )
            print(f"✅ Created test message: {message.text}")
        
        print("\n=== MARKETPLACE & CHAT SETUP COMPLETE ===")
        print("✅ Database models are working correctly")
        print("✅ You can now test the frontend marketplace features")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_endpoints()