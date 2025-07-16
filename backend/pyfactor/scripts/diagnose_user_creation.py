#!/usr/bin/env python
"""
Diagnostic script to check user creation configuration
"""
import os
import sys
import django
from django.conf import settings

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def check_environment_variables():
    """Check if required environment variables are set"""
    print("\n" + "="*60)
    print("User Creation Configuration Diagnosis")
    print("="*60)
    
    required_vars = {
        'AUTH0_MANAGEMENT_CLIENT_ID': 'Auth0 Management API Client ID',
        'AUTH0_MANAGEMENT_CLIENT_SECRET': 'Auth0 Management API Client Secret',
        'RESEND_API_KEY': 'Resend Email API Key',
        'DEFAULT_FROM_EMAIL': 'Default From Email',
        'AUTH0_CLIENT_ID': 'Auth0 Client ID',
        'AUTH0_DOMAIN': 'Auth0 Domain',
    }
    
    missing_vars = []
    
    print("\n📋 Environment Variables Check:")
    print("-" * 50)
    
    for var_name, description in required_vars.items():
        try:
            value = getattr(settings, var_name, None) or os.environ.get(var_name)
            if value:
                if 'SECRET' in var_name or 'KEY' in var_name:
                    masked_value = value[:8] + '*' * (len(value) - 8) if len(value) > 8 else '*' * len(value)
                    print(f"✅ {var_name}: {masked_value}")
                else:
                    print(f"✅ {var_name}: {value}")
            else:
                print(f"❌ {var_name}: NOT SET")
                missing_vars.append(var_name)
        except Exception as e:
            print(f"⚠️  {var_name}: Error checking - {str(e)}")
            missing_vars.append(var_name)
    
    if missing_vars:
        print(f"\n🚨 MISSING VARIABLES ({len(missing_vars)}):")
        for var in missing_vars:
            print(f"   - {var}: {required_vars[var]}")
        
        print(f"\n💡 To fix user creation, add these to your Render environment:")
        for var in missing_vars:
            print(f"   {var}=your_value_here")
    else:
        print(f"\n✅ All required environment variables are configured!")

if __name__ == "__main__":
    check_environment_variables()