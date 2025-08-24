#!/usr/bin/env python
"""
Search for users with similar email addresses to find typos or variations.
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

def search_similar_users(email_pattern):
    """Search for users with similar email addresses"""
    
    print(f"\n{'='*60}")
    print(f"SEARCHING FOR SIMILAR USERS: {email_pattern}")
    print(f"{'='*60}")
    
    # Extract username part (before @)
    if '@' in email_pattern:
        username = email_pattern.split('@')[0]
        domain = email_pattern.split('@')[1] if len(email_pattern.split('@')) > 1 else ''
    else:
        username = email_pattern
        domain = ''
    
    # Search strategies
    print(f"\nSearching for variations of: {username}")
    
    # 1. Exact match (case-insensitive)
    exact_matches = User.objects.filter(email__iexact=email_pattern)
    if exact_matches.exists():
        print(f"\n✅ Exact matches found:")
        for user in exact_matches:
            print(f"  - {user.email} (joined: {user.date_joined})")
    
    # 2. Contains username (partial match)
    partial_matches = User.objects.filter(
        Q(email__icontains=username) |
        Q(email__icontains=username.replace('.', '')) |  # Without dots
        Q(email__icontains=username.replace('_', '')) |  # Without underscores
        Q(email__icontains=username.replace('-', ''))    # Without hyphens
    ).exclude(email__iexact=email_pattern)
    
    if partial_matches.exists():
        print(f"\n🔍 Similar usernames found:")
        for user in partial_matches[:10]:  # Limit to 10 results
            print(f"  - {user.email} (joined: {user.date_joined})")
    
    # 3. Recent registrations (last 24 hours)
    from django.utils import timezone
    from datetime import timedelta
    
    recent_cutoff = timezone.now() - timedelta(hours=24)
    recent_users = User.objects.filter(
        date_joined__gte=recent_cutoff
    ).order_by('-date_joined')
    
    if recent_users.exists():
        print(f"\n📅 Recent registrations (last 24 hours):")
        for user in recent_users[:10]:
            print(f"  - {user.email} (joined: {user.date_joined})")
    
    # 4. Check for common typos
    typo_variations = []
    
    # Common Gmail typos
    if 'gmail' in email_pattern:
        typo_variations.extend([
            email_pattern.replace('gmail', 'gmai'),
            email_pattern.replace('gmail', 'gmial'),
            email_pattern.replace('gmail', 'gmaill'),
        ])
    
    # Check each typo variation
    for typo in typo_variations:
        typo_matches = User.objects.filter(email__iexact=typo)
        if typo_matches.exists():
            print(f"\n⚠️ Possible typo found:")
            for user in typo_matches:
                print(f"  - {user.email} (joined: {user.date_joined})")
    
    # 5. Summary
    total_users = User.objects.count()
    print(f"\n📊 Database Summary:")
    print(f"  - Total users in database: {total_users}")
    
    # Check if no users found at all
    if not exact_matches.exists() and not partial_matches.exists():
        print(f"\n❌ No users found similar to: {email_pattern}")
        print(f"\nPossible reasons:")
        print(f"  1. User registration failed during OAuth callback")
        print(f"  2. Email was typed incorrectly")
        print(f"  3. User used a different email for sign-up")
        print(f"  4. Database write failed during user creation")
        print(f"\nRecommendations:")
        print(f"  1. Check Auth0 logs for this email")
        print(f"  2. Check application logs during the time of registration")
        print(f"  3. Have user try signing up again")
        print(f"  4. Check for any database connection issues")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Search for similar users')
    parser.add_argument('--email', required=True, help='Email pattern to search for')
    
    args = parser.parse_args()
    
    search_similar_users(args.email)

if __name__ == "__main__":
    main()