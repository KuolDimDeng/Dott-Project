#!/usr/bin/env python
"""
Script to check Django migration dependencies without running migrations.
This helps catch dependency issues before deploying to production.
"""

import os
import sys
import django
from django.core.management import execute_from_command_line

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Initialize Django
django.setup()

from django.db.migrations.loader import MigrationLoader
from django.db import connection

print("🔍 Checking Django Migration Dependencies")
print("=" * 50)

try:
    # Load all migrations
    loader = MigrationLoader(connection)
    
    # Check for consistency
    loader.graph.validate_consistency()
    
    print("✅ All migration dependencies are valid!")
    print("\n📋 Migration apps found:")
    
    # List all apps with migrations
    apps_with_migrations = set()
    for migration_key in loader.graph.nodes:
        app_name, migration_name = migration_key
        apps_with_migrations.add(app_name)
    
    for app in sorted(apps_with_migrations):
        migrations = [m for (a, m) in loader.graph.nodes if a == app]
        print(f"\n  {app}: {len(migrations)} migrations")
        # Show last 3 migrations for each app
        for migration in sorted(migrations)[-3:]:
            print(f"    - {migration}")
    
    print("\n✅ Migration dependency check passed!")
    
except Exception as e:
    print(f"\n❌ Migration dependency error found:")
    print(f"   {type(e).__name__}: {e}")
    print("\n💡 Fix this error before deploying to production!")
    sys.exit(1)