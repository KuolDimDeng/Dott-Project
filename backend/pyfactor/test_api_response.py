"""
Test what the /api/users/me endpoint actually returns
"""

from django.test import RequestFactory
from custom_auth.models import User
from users.api.user_profile_views import UserProfileMeView
from session_manager.models import UserSession

email = 'support@dottapps.com'

try:
    user = User.objects.get(email=email)
    print(f"✅ Found user: {user.email}")
    
    # Get an active session for this user
    session = UserSession.objects.filter(user=user, is_active=True).first()
    if session:
        print(f"✅ Found active session: {session.session_id}")
    
    # Create a mock request
    factory = RequestFactory()
    request = factory.get('/api/users/me/')
    request.user = user
    
    # Call the view directly
    view = UserProfileMeView()
    response = view.get(request)
    
    # Render the response first if needed
    if hasattr(response, 'render'):
        response.render()
    
    # Get the response data
    import json
    response_data = json.loads(response.content.decode('utf-8'))
    
    print(f"\n📊 API Response for /api/users/me:")
    print(f"  Email: {response_data.get('email')}")
    print(f"  Country: {response_data.get('country')}")
    print(f"  Business Country: {response_data.get('business_country')}")
    print(f"  Tenant ID: {response_data.get('tenant_id')}")
    print(f"  Business ID: {response_data.get('business_id')}")
    
    # Check if country is being overridden somewhere
    if response_data.get('country') != 'SS':
        print(f"\n⚠️  WARNING: Expected country 'SS' but got '{response_data.get('country')}'")
    
except User.DoesNotExist:
    print(f"❌ User {email} not found")
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()