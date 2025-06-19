#!/bin/bash

# Verify Deployment Script
# Run this on Render to verify the enhanced security deployment

echo "===== VERIFYING ENHANCED SECURITY DEPLOYMENT ====="
echo

# 1. Check if migrations can run
echo "1. Testing migrations..."
python manage.py showmigrations session_manager
echo

# 2. Run the migration
echo "2. Running session_manager migrations..."
python manage.py migrate session_manager
echo

# 3. Check database tables
echo "3. Checking new security tables..."
python manage.py dbshell << EOF
\dt session_manager_*
\d device_fingerprints
\d session_security
\d device_trust
\q
EOF
echo

# 4. Test health endpoint
echo "4. Testing health endpoint..."
curl -s https://api.dottapps.com/health/ | head -20
echo

# 5. Check Redis connection
echo "5. Testing Redis connection..."
python manage.py shell << EOF
from session_manager.services import session_service
print(f"Redis client: {session_service.redis_client}")
if session_service.redis_client:
    try:
        session_service.redis_client.ping()
        print("✓ Redis connection successful")
    except Exception as e:
        print(f"✗ Redis error: {e}")
else:
    print("✗ Redis not configured")
EOF
echo

# 6. Create test session with fingerprint
echo "6. Testing session creation with device fingerprint..."
python manage.py shell << EOF
from custom_auth.models import User
from session_manager.security_service import security_service

# Get a test user
user = User.objects.first()
if user:
    print(f"Test user: {user.email}")
    
    # Test fingerprint data
    fingerprint_data = {
        'userAgent': 'Test/1.0',
        'platform': 'Test',
        'screenResolution': '1920x1080',
        'timezone': 'UTC',
        'ipAddress': '127.0.0.1'
    }
    
    try:
        # Create secure session
        session, security = security_service.create_secure_session(
            user=user,
            access_token='test_token_123',
            fingerprint_data=fingerprint_data
        )
        
        print(f"✓ Session created: {session.session_id}")
        print(f"  Risk score: {security.current_risk_score}")
        print(f"  Device fingerprint: {security.device_fingerprint.fingerprint_id if security.device_fingerprint else 'None'}")
        
        # Clean up
        session.delete()
        
    except Exception as e:
        print(f"✗ Error creating session: {e}")
else:
    print("✗ No users found for testing")
EOF
echo

echo "===== DEPLOYMENT VERIFICATION COMPLETE ====="
echo
echo "Next steps:"
echo "1. Check for any errors above"
echo "2. Monitor application logs for [SecurityService] entries"
echo "3. Test sign-in with a real user"
echo "4. Check session_security table for risk scores"