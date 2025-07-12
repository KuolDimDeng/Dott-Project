#!/usr/bin/env python3
"""
Script to check available URLs in the Django project
"""

import os
import sys
import django

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.urls import get_resolver
from django.urls.resolvers import URLPattern, URLResolver

def list_urls(urlpatterns, prefix=''):
    """Recursively list all URL patterns"""
    urls = []
    for pattern in urlpatterns:
        if isinstance(pattern, URLPattern):
            # Regular URL pattern
            url = prefix + str(pattern.pattern)
            name = pattern.name or 'unnamed'
            urls.append((url, name))
        elif isinstance(pattern, URLResolver):
            # Included URLconf
            sub_prefix = prefix + str(pattern.pattern)
            urls.extend(list_urls(pattern.url_patterns, sub_prefix))
    return urls

# Get all URL patterns
resolver = get_resolver()
all_urls = list_urls(resolver.url_patterns)

# Filter and display auth-related URLs
print("=== All Auth-Related URLs ===")
auth_urls = [url for url in all_urls if 'auth' in url[0].lower() or 'login' in url[0].lower()]
for url, name in sorted(auth_urls):
    print(f"{url:<60} [{name}]")

print("\n=== Password Login Specific ===")
password_urls = [url for url in all_urls if 'password' in url[0].lower()]
for url, name in sorted(password_urls):
    print(f"{url:<60} [{name}]")