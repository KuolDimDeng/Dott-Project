#!/usr/bin/env python3
"""
Generate secure credentials for production deployment
"""

import secrets
import string
import hashlib
import base64
from datetime import datetime

def generate_password(length=32):
    """Generate a cryptographically secure password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password

def generate_django_secret_key():
    """Generate a Django secret key"""
    chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(-_=+)'
    return ''.join(secrets.choice(chars) for _ in range(50))

def generate_api_key():
    """Generate a secure API key"""
    return secrets.token_urlsafe(32)

def generate_webhook_secret():
    """Generate a webhook signing secret"""
    return f"whsec_{secrets.token_hex(32)}"

def main():
    print("🔐 SECURE CREDENTIAL GENERATOR")
    print("=" * 50)
    print()
    
    # Generate credentials
    db_password = generate_password(32)
    django_secret = generate_django_secret_key()
    api_key = generate_api_key()
    webhook_secret = generate_webhook_secret()
    session_secret = secrets.token_hex(32)
    
    print("📋 Copy these to your .env file:")
    print("-" * 50)
    print()
    
    print("# Database Credentials")
    print(f"DB_PASSWORD={db_password}")
    print()
    
    print("# Django Configuration")
    print(f"SECRET_KEY={django_secret}")
    print()
    
    print("# Session Security")
    print(f"SESSION_SECRET_KEY={session_secret}")
    print()
    
    print("# API Keys (replace with actual service keys)")
    print(f"INTERNAL_API_KEY={api_key}")
    print(f"WEBHOOK_SIGNING_SECRET={webhook_secret}")
    print()
    
    print("-" * 50)
    print("⚠️  SECURITY REMINDERS:")
    print("1. Never commit these values to git")
    print("2. Use different values for dev/staging/production")
    print("3. Rotate credentials regularly (every 90 days)")
    print("4. Store backups in a secure password manager")
    print("5. Enable MFA on all service accounts")
    print()
    
    # Save to a temporary file (optional)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"credentials_{timestamp}.txt"
    
    response = input("Save to temporary file? (y/n): ")
    if response.lower() == 'y':
        with open(filename, 'w') as f:
            f.write(f"# Generated on {datetime.now()}\n")
            f.write(f"# DELETE THIS FILE AFTER COPYING TO .env\n\n")
            f.write(f"DB_PASSWORD={db_password}\n")
            f.write(f"SECRET_KEY={django_secret}\n")
            f.write(f"SESSION_SECRET_KEY={session_secret}\n")
            f.write(f"INTERNAL_API_KEY={api_key}\n")
            f.write(f"WEBHOOK_SIGNING_SECRET={webhook_secret}\n")
        print(f"✅ Saved to {filename}")
        print("⚠️  Remember to delete this file after copying values!")
    
    print()
    print("✅ Credentials generated successfully!")

if __name__ == "__main__":
    main()