#!/usr/bin/env python3
"""
Cleanup orphaned users that exist in database but not in Auth0
"""
import os
import sys
import django
from pathlib import Path

# Add the parent directory to the path
sys.path.append(str(Path(__file__).resolve().parent.parent))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User
from django.db import connection
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def cleanup_orphaned_users():
    """Find and optionally delete users that have temporary auth0_sub values"""
    
    # Find users with temporary auth0_sub (these were created but never synced with Auth0)
    orphaned_users = User.objects.filter(auth0_sub__startswith='pending_')
    
    logger.info(f"Found {orphaned_users.count()} orphaned users:")
    
    for user in orphaned_users:
        logger.info(f"  - {user.email} (ID: {user.id}, auth0_sub: {user.auth0_sub})")
    
    if orphaned_users.count() == 0:
        logger.info("No orphaned users found.")
        return
    
    # Ask for confirmation
    response = input("\nDo you want to delete these orphaned users? (yes/no): ")
    
    if response.lower() == 'yes':
        count = orphaned_users.count()
        orphaned_users.delete()
        logger.info(f"Deleted {count} orphaned users.")
    else:
        logger.info("No users deleted.")
    
    # Also check for specific email if provided
    if len(sys.argv) > 1:
        email = sys.argv[1]
        logger.info(f"\nChecking specific email: {email}")
        try:
            user = User.objects.get(email=email)
            logger.info(f"Found user: {user.email} (ID: {user.id}, auth0_sub: {user.auth0_sub})")
            
            if user.auth0_sub.startswith('pending_'):
                response = input(f"\nThis user has not been synced with Auth0. Delete? (yes/no): ")
                if response.lower() == 'yes':
                    user.delete()
                    logger.info(f"Deleted user {email}")
        except User.DoesNotExist:
            logger.info(f"User {email} not found in database")

if __name__ == "__main__":
    cleanup_orphaned_users()