"""
Django management command to test WhatsApp commerce preference in session data
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from custom_auth.models import User
from users.models import UserProfile
from session_manager.models import UserSession
from session_manager.serializers import SessionSerializer
import json


class Command(BaseCommand):
    help = 'Test that WhatsApp commerce preference is included in session data'
    
    def handle(self, *args, **options):
        self.stdout.write("\n=== Testing WhatsApp Commerce in Session Data ===\n")
        
        # Find a user with a session
        sessions = UserSession.objects.filter(is_active=True).select_related('user').order_by('-created_at')[:5]
        
        if not sessions:
            self.stdout.write(self.style.WARNING("No active sessions found. Please create a session first."))
            return
        
        for session in sessions:
            user = session.user
            self.stdout.write(f"\nTesting user: {user.email}")
            self.stdout.write(f"Session ID: {session.session_id}")
            
            # Check if user has a profile
            try:
                profile = UserProfile.objects.get(user=user)
                self.stdout.write(f"User has profile: Yes")
                self.stdout.write(f"Country: {profile.country}")
                self.stdout.write(f"WhatsApp preference (explicit): {profile.show_whatsapp_commerce}")
                self.stdout.write(f"WhatsApp preference (effective): {profile.get_whatsapp_commerce_preference()}")
            except UserProfile.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"User has profile: No"))
                profile = None
            
            # Serialize the session
            serializer = SessionSerializer(session)
            session_data = serializer.data
            
            # Check user data in serialized session
            user_data = session_data.get('user', {})
            self.stdout.write(f"\nSerialized session data:")
            
            has_whatsapp = 'show_whatsapp_commerce' in user_data
            self.stdout.write(f"- Has 'show_whatsapp_commerce': {has_whatsapp}")
            if has_whatsapp:
                self.stdout.write(self.style.SUCCESS(f"  Value: {user_data['show_whatsapp_commerce']}"))
            else:
                self.stdout.write(self.style.ERROR("  Field is missing!"))
            
            has_explicit = 'whatsapp_commerce_explicit' in user_data
            self.stdout.write(f"- Has 'whatsapp_commerce_explicit': {has_explicit}")
            if has_explicit:
                self.stdout.write(f"  Value: {user_data['whatsapp_commerce_explicit']}")
            
            has_country = 'country' in user_data
            self.stdout.write(f"- Has 'country': {has_country}")
            if has_country:
                self.stdout.write(f"  Value: {user_data['country']}")
            
            # Pretty print the relevant part of the session data
            self.stdout.write(f"\nFull user data in session:")
            relevant_fields = {
                'email': user_data.get('email'),
                'role': user_data.get('role'),
                'show_whatsapp_commerce': user_data.get('show_whatsapp_commerce'),
                'whatsapp_commerce_explicit': user_data.get('whatsapp_commerce_explicit'),
                'country': user_data.get('country')
            }
            self.stdout.write(json.dumps(relevant_fields, indent=2))
            
            self.stdout.write("\n" + "="*60)