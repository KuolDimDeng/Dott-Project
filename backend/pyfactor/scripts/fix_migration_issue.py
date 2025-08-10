#!/usr/bin/env python3
"""
Script to diagnose and fix the migration issue in production.
This will help identify which migration is causing the TaxFiling KeyError.
"""
import os
import sys
import django
from django.db import migrations
from django.apps import apps

# Add the project root to the Python path
project_root = '/app' if os.path.exists('/app/manage.py') else '/Users/kuoldeng/projectx/backend/pyfactor'
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db.migrations.loader import MigrationLoader
from django.db.migrations.recorder import MigrationRecorder

def diagnose_migration_issue():
    """Diagnose the migration state and find the problematic migration."""
    print("🔍 Diagnosing migration issue...")
    
    try:
        # Check current migration state
        recorder = MigrationRecorder(connection=None)
        applied_migrations = recorder.applied_migrations()
        
        print(f"📊 Applied migrations: {len(applied_migrations)}")
        
        # Check taxes app migrations specifically
        taxes_migrations = [m for m in applied_migrations if m[0] == 'taxes']
        print(f"📊 Applied taxes migrations: {len(taxes_migrations)}")
        
        for migration in sorted(taxes_migrations):
            print(f"  ✅ {migration[0]}.{migration[1]}")
        
        # Load migration graph
        loader = MigrationLoader(connection=None)
        print(f"📊 Total migrations in graph: {len(loader.graph.nodes)}")
        
        # Check for taxes migrations in the graph
        taxes_nodes = [node for node in loader.graph.nodes if node[0] == 'taxes']
        print(f"📊 Taxes migrations in graph: {len(taxes_nodes)}")
        
        for node in sorted(taxes_nodes):
            print(f"  📋 {node[0]}.{node[1]}")
        
        # Find unapplied migrations
        unapplied = loader.graph.nodes - applied_migrations
        taxes_unapplied = [m for m in unapplied if m[0] == 'taxes']
        
        print(f"📊 Unapplied taxes migrations: {len(taxes_unapplied)}")
        for migration in sorted(taxes_unapplied):
            print(f"  ❌ {migration[0]}.{migration[1]}")
        
        # Check if TaxFiling model exists
        try:
            from taxes.models import TaxFiling
            print("✅ TaxFiling model exists and can be imported")
        except ImportError as e:
            print(f"❌ TaxFiling model import failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during diagnosis: {e}")
        return False

def fix_migration_state():
    """Attempt to fix the migration state."""
    print("🔧 Attempting to fix migration state...")
    
    try:
        # Check if we can create a fresh migration for the current models
        from django.core.management import call_command
        
        print("Creating fresh migrations...")
        call_command('makemigrations', 'taxes', verbosity=2)
        
        return True
        
    except Exception as e:
        print(f"❌ Error fixing migration state: {e}")
        return False

if __name__ == '__main__':
    print("🚀 Migration Diagnostic Tool")
    print("=" * 50)
    
    # Diagnose the issue
    success = diagnose_migration_issue()
    
    if not success:
        print("❌ Diagnosis failed. Manual intervention required.")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("✅ Diagnosis complete. Check output above for issues.")