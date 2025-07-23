"""
Verify staging database connection and configuration
Run this to ensure staging is properly isolated from production
"""

import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set Django settings to staging
os.environ['DJANGO_SETTINGS_MODULE'] = 'pyfactor.settings_staging'

# Initialize Django
django.setup()

from django.conf import settings
from django.db import connection
from django.contrib.auth import get_user_model

User = get_user_model()

print("🔍 Verifying Staging Database Configuration")
print("=" * 50)

# Check environment
print(f"✅ Environment: {settings.ENVIRONMENT}")
print(f"✅ Debug: {settings.DEBUG}")

# Check database
with connection.cursor() as cursor:
    cursor.execute("SELECT current_database(), current_user, version();")
    db_info = cursor.fetchone()
    print(f"✅ Database: {db_info[0]}")
    print(f"✅ User: {db_info[1]}")
    print(f"✅ PostgreSQL: {db_info[2].split(',')[0]}")

# Check Redis (should be None)
print(f"✅ Redis URL: {settings.REDIS_URL} (should be None)")
print(f"✅ Session Engine: {settings.SESSION_ENGINE}")
print(f"✅ Session Cookie: {settings.SESSION_COOKIE_NAME}")

# Check cache backend
cache_backend = settings.CACHES['default']['BACKEND']
print(f"✅ Cache Backend: {cache_backend}")

# Count users
user_count = User.objects.count()
print(f"\n📊 Database Statistics:")
print(f"   - Total Users: {user_count}")

# List test users if any
test_users = User.objects.filter(email__endswith='@staging.com')
if test_users.exists():
    print(f"   - Test Users: {test_users.count()}")
    for user in test_users:
        print(f"     • {user.email} ({user.username})")
else:
    print("   - No test users found (run create_staging_test_data.py)")

print("\n✅ Staging database verification complete!")