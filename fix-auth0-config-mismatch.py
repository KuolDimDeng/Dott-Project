#!/usr/bin/env python3
"""
Fix Auth0 Configuration Mismatch
Updates Django backend settings to match frontend Auth0 custom domain configuration
"""

import os
import re
import shutil
from datetime import datetime

def backup_file(file_path):
    """Create a backup of the original file"""
    backup_path = f"{file_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(file_path, backup_path)
    print(f"✅ Backup created: {backup_path}")
    return backup_path

def fix_auth0_settings():
    """Fix Auth0 configuration in Django settings"""
    settings_file = "backend/pyfactor/pyfactor/settings.py"
    
    if not os.path.exists(settings_file):
        print(f"❌ Settings file not found: {settings_file}")
        return False
    
    # Create backup
    backup_file(settings_file)
    
    # Read current settings
    with open(settings_file, 'r') as f:
        content = f.read()
    
    # Update Auth0 domain to match frontend custom domain
    content = re.sub(
        r"AUTH0_DOMAIN = os\.getenv\('AUTH0_DOMAIN', '[^']+'\)",
        "AUTH0_DOMAIN = os.getenv('AUTH0_DOMAIN', 'auth.dottapps.com')",
        content
    )
    
    # Update Auth0 audience if needed
    content = re.sub(
        r"AUTH0_AUDIENCE = os\.getenv\('AUTH0_AUDIENCE', f'https://\{AUTH0_DOMAIN\}/api/v2/'\)",
        "AUTH0_AUDIENCE = os.getenv('AUTH0_AUDIENCE', 'https://dev-cbyy63jovi6zrcos.us.auth0.com/api/v2/')",
        content
    )
    
    # Write updated settings
    with open(settings_file, 'w') as f:
        f.write(content)
    
    print(f"✅ Updated {settings_file}")
    return True

def create_env_update():
    """Create environment variable updates for production"""
    env_updates = """
# Auth0 Configuration Fix - Add to your Render environment variables
AUTH0_DOMAIN=auth.dottapps.com
AUTH0_AUDIENCE=https://dev-cbyy63jovi6zrcos.us.auth0.com/api/v2/
AUTH0_CLIENT_ID=GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ
"""
    
    with open("auth0-env-fix.txt", "w") as f:
        f.write(env_updates)
    
    print("✅ Created auth0-env-fix.txt with environment variable updates")

def main():
    """Main function"""
    print("🔧 Fixing Auth0 Configuration Mismatch...")
    print("=" * 50)
    
    print("\n📋 ISSUE IDENTIFIED:")
    print("   Frontend uses: auth.dottapps.com (custom domain)")
    print("   Backend uses:   dev-cbyy63jovi6zrcos.us.auth0.com (default domain)")
    print("   This causes JWT signature verification failures")
    
    print("\n🛠️  APPLYING FIXES:")
    
    # Fix Django settings
    if fix_auth0_settings():
        print("   ✅ Django settings updated")
    else:
        print("   ❌ Failed to update Django settings")
        return False
    
    # Create environment updates
    create_env_update()
    
    print("\n🎯 NEXT STEPS:")
    print("1. Deploy the updated backend code")
    print("2. Update Render environment variables:")
    print("   - AUTH0_DOMAIN=auth.dottapps.com")
    print("   - AUTH0_AUDIENCE=https://dev-cbyy63jovi6zrcos.us.auth0.com/api/v2/")
    print("3. Restart the backend service")
    print("4. Test the authentication flow")
    
    print("\n✅ Auth0 configuration mismatch fix completed!")
    print("   This should resolve the 'Invalid payload padding' errors")
    
    return True

if __name__ == "__main__":
    main() 