#!/usr/bin/env python
"""
Industry-standard automated migration handler
Handles Django migrations without manual prompts
"""
import os
import sys
import django
from pathlib import Path

# Add the parent directory to the Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.core.management import call_command
from django.db import connection
from django.apps import apps
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def auto_makemigrations():
    """
    Create migrations for all apps with auto-answers to prompts
    Industry-standard approach: Always choose safe defaults
    """
    print("=" * 60)
    print("AUTO-GENERATING MIGRATIONS")
    print("=" * 60)
    
    apps_to_migrate = [
        'users', 'hr', 'jobs', 'payments', 'taxes', 
        'banking', 'inventory', 'accounting', 'session_manager'
    ]
    
    for app_name in apps_to_migrate:
        try:
            print(f"\n📦 Processing {app_name}...")
            
            # Use --noinput to skip all prompts
            # Use --merge to auto-merge conflicts
            call_command(
                'makemigrations',
                app_name,
                interactive=False,  # No prompts
                verbosity=2,
                noinput=True,  # Skip all input
                merge=True,  # Auto-merge conflicts
            )
            print(f"✅ {app_name}: migrations created")
            
        except Exception as e:
            if "No changes detected" in str(e):
                print(f"✓ {app_name}: no changes needed")
            else:
                print(f"⚠️ {app_name}: {e}")
    
    print("\n" + "=" * 60)
    print("MIGRATION GENERATION COMPLETE")
    print("=" * 60)

def squash_migrations(app_name, start_migration=None):
    """
    Squash migrations for better performance
    Industry-standard for production deployments
    """
    try:
        print(f"\n🗜️ Squashing migrations for {app_name}...")
        
        if start_migration:
            call_command(
                'squashmigrations',
                app_name,
                start_migration,
                interactive=False,
                verbosity=2,
            )
        else:
            # Find the initial migration
            from django.db.migrations.loader import MigrationLoader
            loader = MigrationLoader(connection)
            
            app_migrations = [
                m for m in loader.graph.nodes 
                if m[0] == app_name
            ]
            
            if len(app_migrations) > 10:  # Only squash if many migrations
                initial = sorted(app_migrations)[0][1]
                latest = sorted(app_migrations)[-1][1]
                
                call_command(
                    'squashmigrations',
                    app_name,
                    f"{initial}",
                    f"{latest}",
                    interactive=False,
                    verbosity=2,
                )
                print(f"✅ Squashed {len(app_migrations)} migrations")
            else:
                print(f"✓ {app_name}: only {len(app_migrations)} migrations, skipping squash")
                
    except Exception as e:
        print(f"⚠️ Could not squash {app_name}: {e}")

def show_pending_migrations():
    """
    Show all pending migrations
    """
    print("\n" + "=" * 60)
    print("PENDING MIGRATIONS")
    print("=" * 60)
    
    try:
        call_command('showmigrations', plan=True, verbosity=2)
    except Exception as e:
        print(f"Error showing migrations: {e}")

def apply_migrations(fake=False):
    """
    Apply all migrations
    """
    print("\n" + "=" * 60)
    print("APPLYING MIGRATIONS" + (" (FAKE)" if fake else ""))
    print("=" * 60)
    
    try:
        if fake:
            call_command('migrate', fake=True, verbosity=2)
        else:
            call_command('migrate', verbosity=2)
        print("✅ All migrations applied successfully")
    except Exception as e:
        print(f"❌ Error applying migrations: {e}")
        return False
    return True

def main():
    """
    Main execution
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Automated Django migration handler')
    parser.add_argument('--make', action='store_true', help='Create migrations')
    parser.add_argument('--squash', type=str, help='Squash migrations for app')
    parser.add_argument('--show', action='store_true', help='Show pending migrations')
    parser.add_argument('--apply', action='store_true', help='Apply migrations')
    parser.add_argument('--fake', action='store_true', help='Fake apply migrations')
    parser.add_argument('--all', action='store_true', help='Do everything: make, apply')
    
    args = parser.parse_args()
    
    if args.all:
        auto_makemigrations()
        show_pending_migrations()
        apply_migrations()
    elif args.make:
        auto_makemigrations()
    elif args.squash:
        squash_migrations(args.squash)
    elif args.show:
        show_pending_migrations()
    elif args.apply:
        apply_migrations(fake=args.fake)
    else:
        print("Industry-Standard Migration Handler")
        print("=" * 40)
        print("Usage:")
        print("  python auto_migrate.py --all         # Do everything")
        print("  python auto_migrate.py --make        # Create migrations")
        print("  python auto_migrate.py --show        # Show pending")
        print("  python auto_migrate.py --apply       # Apply migrations")
        print("  python auto_migrate.py --fake        # Fake apply")
        print("  python auto_migrate.py --squash users # Squash app migrations")

if __name__ == '__main__':
    main()