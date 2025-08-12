#!/usr/bin/env python
"""
Test script to verify WhatsApp commerce preference is included in session data
"""

import os
import sys
import django
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from custom_auth.models import User
from users.models import UserProfile
from session_manager.models import UserSession
from session_manager.serializers import SessionSerializer
import json

def test_session_whatsapp_data():
    """Test that WhatsApp commerce preference is included in session serialization"""
    
    print("\n=== Testing WhatsApp Commerce in Session Data ===\n")
    
    # Find a user with a session
    sessions = UserSession.objects.filter(is_active=True).select_related('user').order_by('-created_at')[:5]
    
    if not sessions:
        print("No active sessions found. Please create a session first.")
        return
    
    for session in sessions:
        user = session.user
        print(f"\nTesting user: {user.email}")
        print(f"Session ID: {session.session_id}")
        
        # Check if user has a profile
        try:
            profile = UserProfile.objects.get(user=user)
            print(f"User has profile: Yes")
            print(f"Country: {profile.country}")
            print(f"WhatsApp preference (explicit): {profile.show_whatsapp_commerce}")
            print(f"WhatsApp preference (effective): {profile.get_whatsapp_commerce_preference()}")
        except UserProfile.DoesNotExist:
            print(f"User has profile: No")
            profile = None
        
        # Serialize the session
        serializer = SessionSerializer(session)
        session_data = serializer.data
        
        # Check user data in serialized session
        user_data = session_data.get('user', {})
        print(f"\nSerialized session data:")
        print(f"- Has 'show_whatsapp_commerce': {'show_whatsapp_commerce' in user_data}")
        if 'show_whatsapp_commerce' in user_data:
            print(f"  Value: {user_data['show_whatsapp_commerce']}")
        print(f"- Has 'whatsapp_commerce_explicit': {'whatsapp_commerce_explicit' in user_data}")
        if 'whatsapp_commerce_explicit' in user_data:
            print(f"  Value: {user_data['whatsapp_commerce_explicit']}")
        print(f"- Has 'country': {'country' in user_data}")
        if 'country' in user_data:
            print(f"  Value: {user_data['country']}")
        
        # Pretty print the relevant part of the session data
        print(f"\nFull user data in session:")
        relevant_fields = {
            'email': user_data.get('email'),
            'role': user_data.get('role'),
            'show_whatsapp_commerce': user_data.get('show_whatsapp_commerce'),
            'whatsapp_commerce_explicit': user_data.get('whatsapp_commerce_explicit'),
            'country': user_data.get('country')
        }
        print(json.dumps(relevant_fields, indent=2))
        
        print("\n" + "="*60)

if __name__ == "__main__":
    test_session_whatsapp_data()