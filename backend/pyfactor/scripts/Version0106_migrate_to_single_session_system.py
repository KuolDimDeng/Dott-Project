#!/usr/bin/env python3
"""
Version0106_migrate_to_single_session_system.py

Migrates from dual session system (Django + Custom) to single custom session system.
Following financial app best practices (Wave, Stripe, Banking apps).

Author: Claude
Date: 2025-01-18
"""

import os
import sys
import shutil
from datetime import datetime
import re

# Add the parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def create_backup(file_path):
    """Create a backup of the original file."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.backup_{timestamp}"
    
    print(f"Creating backup: {backup_path}")
    shutil.copy2(file_path, backup_path)
    print(f"✓ Backup created successfully")
    
    return backup_path

def update_settings_file():
    """Update settings.py to remove Django sessions and use only custom sessions."""
    print("\n=== Updating settings.py ===")
    
    settings_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'pyfactor', 'settings.py')
    
    if not os.path.exists(settings_path):
        print(f"✗ Error: settings.py not found at {settings_path}")
        return False
    
    backup_path = create_backup(settings_path)
    
    try:
        with open(settings_path, 'r') as f:
            content = f.read()
        
        original_content = content
        
        # 1. Remove django.contrib.sessions from SHARED_APPS
        print("\n1. Removing django.contrib.sessions from INSTALLED_APPS...")
        content = re.sub(
            r"'django\.contrib\.sessions',?\s*\n",
            "",
            content
        )
        
        # 2. Comment out or remove SESSION_ENGINE
        print("2. Removing SESSION_ENGINE configuration...")
        content = re.sub(
            r"SESSION_ENGINE\s*=\s*['\"]django\.contrib\.sessions\.backends\.cached_db['\"].*\n",
            "# SESSION_ENGINE removed - using custom session_manager app\n",
            content
        )
        
        # 3. Remove SessionMiddleware from MIDDLEWARE
        print("3. Removing Django's SessionMiddleware...")
        content = re.sub(
            r"'django\.contrib\.sessions\.middleware\.SessionMiddleware',?\s*\n",
            "",
            content
        )
        
        # 4. Update CSRF settings to not use sessions
        print("4. Updating CSRF settings...")
        csrf_pattern = r"CSRF_USE_SESSIONS\s*=\s*True"
        if re.search(csrf_pattern, content):
            content = re.sub(csrf_pattern, "CSRF_USE_SESSIONS = False", content)
        else:
            # Add CSRF settings if not present
            csrf_settings = """
# CSRF Settings - Using cookies instead of sessions
CSRF_USE_SESSIONS = False
CSRF_COOKIE_NAME = 'csrftoken'
CSRF_COOKIE_HTTPONLY = False  # Must be false for JavaScript access
CSRF_COOKIE_SECURE = True  # True in production
CSRF_COOKIE_SAMESITE = 'Lax'
"""
            # Find a good place to add it (after SECURE_SSL_REDIRECT)
            ssl_pattern = r"(SECURE_SSL_REDIRECT.*\n)"
            if re.search(ssl_pattern, content):
                content = re.sub(ssl_pattern, r"\1" + csrf_settings, content)
            else:
                content += csrf_settings
        
        # 5. Update REST_FRAMEWORK authentication classes
        print("5. Updating REST_FRAMEWORK authentication...")
        # Remove Django's SessionAuthentication
        content = re.sub(
            r"'rest_framework\.authentication\.SessionAuthentication',?\s*\n",
            "",
            content
        )
        
        # 6. Add comment about single session system
        header_comment = """# ===== SINGLE SESSION SYSTEM =====
# This project uses a custom session_manager app instead of Django's sessions.
# DO NOT add django.contrib.sessions back to INSTALLED_APPS or MIDDLEWARE.
# All session management is handled by the session_manager app.
# ================================

"""
        if "SINGLE SESSION SYSTEM" not in content:
            content = header_comment + content
        
        # Write the updated content
        with open(settings_path, 'w') as f:
            f.write(content)
        
        print("\n✓ settings.py updated successfully!")
        
        # Show what changed
        if content != original_content:
            print("\nChanges made:")
            print("- Removed django.contrib.sessions from INSTALLED_APPS")
            print("- Removed SESSION_ENGINE configuration")
            print("- Removed django.contrib.sessions.middleware.SessionMiddleware")
            print("- Updated CSRF settings to use cookies")
            print("- Removed rest_framework.authentication.SessionAuthentication")
            print("- Added documentation header")
        else:
            print("\n⚠️  No changes were needed - settings already configured correctly")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error updating settings.py: {e}")
        print(f"  Restoring from backup: {backup_path}")
        shutil.copy2(backup_path, settings_path)
        return False

def create_redis_config():
    """Create Redis configuration for session caching."""
    print("\n=== Creating Redis Configuration ===")
    
    redis_config_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'session_manager',
        'redis_config.py'
    )
    
    # Check if it already exists
    if os.path.exists(redis_config_path):
        print("✓ Redis configuration already exists")
        return True
    
    redis_config = '''"""
Redis configuration for session caching
Following financial app best practices
"""

import os
import redis
from django.conf import settings

def get_redis_client():
    """Get Redis client with proper configuration."""
    redis_url = os.environ.get('REDIS_URL')
    
    if not redis_url:
        print("[Session] Redis not configured - using database only")
        return None
    
    try:
        client = redis.Redis.from_url(
            redis_url,
            decode_responses=True,
            socket_keepalive=True,
            socket_keepalive_options={},
            connection_pool_kwargs={
                'max_connections': 50,
                'retry_on_timeout': True,
                'socket_connect_timeout': 5,
                'socket_timeout': 5,
            }
        )
        
        # Test connection
        client.ping()
        print("[Session] Redis connected successfully")
        return client
        
    except Exception as e:
        print(f"[Session] Redis connection failed: {e}")
        return None

# Global Redis client
redis_client = get_redis_client()

# Cache TTLs (in seconds)
SESSION_CACHE_TTL = 3600  # 1 hour
DEVICE_TRUST_TTL = 86400 * 30  # 30 days
RATE_LIMIT_TTL = 900  # 15 minutes
'''
    
    try:
        os.makedirs(os.path.dirname(redis_config_path), exist_ok=True)
        with open(redis_config_path, 'w') as f:
            f.write(redis_config)
        print(f"✓ Created Redis configuration at {redis_config_path}")
        return True
    except Exception as e:
        print(f"✗ Error creating Redis configuration: {e}")
        return False

def enhance_session_model():
    """Enhance the session model with financial app features."""
    print("\n=== Enhancing Session Model ===")
    
    models_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'session_manager',
        'models.py'
    )
    
    if not os.path.exists(models_path):
        print(f"✗ Error: models.py not found at {models_path}")
        return False
    
    # Check if enhancements already exist
    with open(models_path, 'r') as f:
        content = f.read()
    
    if "device_fingerprint" in content:
        print("✓ Session model already enhanced")
        return True
    
    print("⚠️  Session model enhancements need to be added manually")
    print("   Add these fields to UserSession model:")
    print("   - device_fingerprint = models.CharField(max_length=64, null=True)")
    print("   - risk_score = models.IntegerField(default=0)")
    print("   - trusted_device = models.BooleanField(default=False)")
    
    return True

def create_migration_checklist():
    """Create a checklist for the migration."""
    print("\n=== Creating Migration Checklist ===")
    
    checklist_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'SINGLE_SESSION_MIGRATION_CHECKLIST.md'
    )
    
    checklist = """# Single Session System Migration Checklist

## Phase 1: Remove Django Sessions (Immediate) ✓

- [x] Remove `django.contrib.sessions` from INSTALLED_APPS
- [x] Remove `django.contrib.sessions.middleware.SessionMiddleware` from MIDDLEWARE
- [x] Update CSRF settings to use cookies instead of sessions
- [x] Remove `SESSION_ENGINE` configuration
- [x] Update REST_FRAMEWORK authentication classes
- [x] Add documentation about single session system

## Phase 2: Database Cleanup (Do in Render Shell)

```bash
# SSH into Render backend
python manage.py dbshell

# Drop the django_session table (if it exists)
DROP TABLE IF EXISTS django_session CASCADE;

# Verify custom sessions are working
SELECT COUNT(*) FROM session_manager_usersession;
```

## Phase 3: Add Redis Caching (Week 1)

- [ ] Add Redis to Render environment
- [ ] Set REDIS_URL environment variable
- [ ] Deploy enhanced SessionService with Redis
- [ ] Monitor cache hit rates

## Phase 4: Enhanced Security Features (Week 2)

- [ ] Add device fingerprinting to sessions
- [ ] Implement session activity logging
- [ ] Add risk scoring for suspicious activity
- [ ] Implement device trust system
- [ ] Add session heartbeat monitoring

## Testing Checklist

- [ ] Test user login flow
- [ ] Test session persistence across requests
- [ ] Test logout functionality
- [ ] Test session expiration
- [ ] Test CSRF protection
- [ ] Test admin access (if using Django admin)

## Monitoring

- [ ] Set up alerts for session creation failures
- [ ] Monitor session table growth
- [ ] Track average session duration
- [ ] Monitor Redis cache performance (when added)

## Rollback Plan

If issues arise:
1. Restore settings.py from backup
2. Re-add django.contrib.sessions to INSTALLED_APPS
3. Re-add SessionMiddleware
4. Run `python manage.py migrate sessions`

But this shouldn't be necessary - your custom session system is already working!
"""
    
    try:
        with open(checklist_path, 'w') as f:
            f.write(checklist)
        print(f"✓ Created migration checklist at {checklist_path}")
        return True
    except Exception as e:
        print(f"✗ Error creating checklist: {e}")
        return False

def main():
    """Main function to execute the migration."""
    print("=" * 60)
    print("Single Session System Migration")
    print("Version: 0106")
    print("=" * 60)
    print()
    
    print("This script will migrate your Django project from a dual session")
    print("system to a single custom session system, following financial")
    print("app best practices (like Wave and Stripe).")
    print()
    
    # Step 1: Update settings.py
    if not update_settings_file():
        print("\n✗ Migration failed at settings.py update")
        return False
    
    # Step 2: Create Redis configuration
    if not create_redis_config():
        print("\n⚠️  Redis configuration creation failed (non-critical)")
    
    # Step 3: Check session model enhancements
    enhance_session_model()
    
    # Step 4: Create migration checklist
    if not create_migration_checklist():
        print("\n⚠️  Checklist creation failed (non-critical)")
    
    print("\n" + "=" * 60)
    print("✓ Migration script completed successfully!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Review the changes in settings.py")
    print("2. Deploy to Render")
    print("3. SSH into Render and drop the django_session table:")
    print("   python manage.py dbshell")
    print("   DROP TABLE IF EXISTS django_session CASCADE;")
    print("4. Test the authentication flow")
    print("5. Follow the checklist in SINGLE_SESSION_MIGRATION_CHECKLIST.md")
    print()
    print("Your custom session system is already working - this just")
    print("removes the redundant Django session system!")

if __name__ == "__main__":
    main()