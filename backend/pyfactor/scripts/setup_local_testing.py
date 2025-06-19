#!/usr/bin/env python
"""
Script to set up local testing environment for Django migrations.
This script will:
1. Create a test database configuration
2. Fix the migration reference issue
3. Run migrations on the test database
"""

import os
import sys
import subprocess
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def create_local_env_file():
    """Create a .env.local file for local testing"""
    env_content = """# Local development environment variables for testing
# This file is for local testing only - DO NOT commit to version control

# Local PostgreSQL database configuration
DB_NAME=dott_test_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# Tax database configuration (using same database for testing)
TAX_DB_NAME=dott_test_db
TAX_DB_USER=postgres
TAX_DB_PASSWORD=postgres
TAX_DB_HOST=localhost
TAX_DB_PORT=5432

# Django Settings
SECRET_KEY='django-insecure-test-key-for-local-development-only'
DEBUG=True

# Disable external services for testing
USE_AUTH0=false

# Stripe test keys (from production .env)
STRIPE_PUBLISHABLE_KEY='pk_test_51RI9epFls6i75mQBc3JI8lpcOUnaMlYAGmbDgOrIylbAqUaCOG035DlZFz35vneimME1QmdSiFiObsv3kcnCSNFi000AABL5EU'
STRIPE_SECRET_KEY='sk_test_51RI9epFls6i75mQBv6NFscXgAuBHwHJg3JUxiqZIwbBktV5S9saUMGrCYqbr5r0ksjgswLXz6KVErzRRDUsDqVSq00wWr5hbIN'

# Other placeholders
PLAID_CLIENT_ID=placeholder
PLAID_SECRET=placeholder
PLAID_ENV=sandbox
"""
    
    env_path = project_root / '.env.local'
    with open(env_path, 'w') as f:
        f.write(env_content)
    print(f"✅ Created {env_path}")
    return env_path


def fix_migration_file():
    """Fix the migration file to use correct User model reference"""
    migration_file = project_root / 'session_manager' / 'migrations' / '0002_enhanced_security.py'
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    # Read the current content
    with open(migration_file, 'r') as f:
        content = f.read()
    
    # Replace 'custom_auth.customuser' with 'custom_auth.user'
    fixed_content = content.replace("'custom_auth.customuser'", "'custom_auth.user'")
    
    if fixed_content != content:
        # Create backup
        backup_file = migration_file.with_suffix('.py.backup')
        with open(backup_file, 'w') as f:
            f.write(content)
        print(f"✅ Created backup: {backup_file}")
        
        # Write fixed content
        with open(migration_file, 'w') as f:
            f.write(fixed_content)
        print(f"✅ Fixed migration file: {migration_file}")
        print("   Replaced 'custom_auth.customuser' with 'custom_auth.user'")
        return True
    else:
        print("ℹ️  Migration file already has correct reference")
        return True


def create_test_database():
    """Create a test database for local testing"""
    print("\n🔧 Creating test database...")
    
    # Check if database exists
    check_db = subprocess.run(
        ['psql', '-U', 'postgres', '-lqt'],
        capture_output=True,
        text=True
    )
    
    if 'dott_test_db' in check_db.stdout:
        print("ℹ️  Test database already exists")
        
        # Ask if user wants to drop and recreate
        response = input("Do you want to drop and recreate the database? (y/N): ")
        if response.lower() == 'y':
            print("Dropping existing database...")
            subprocess.run(
                ['psql', '-U', 'postgres', '-c', 'DROP DATABASE IF EXISTS dott_test_db;'],
                check=True
            )
        else:
            return True
    
    # Create database
    try:
        subprocess.run(
            ['psql', '-U', 'postgres', '-c', 'CREATE DATABASE dott_test_db;'],
            check=True
        )
        print("✅ Created test database: dott_test_db")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to create database: {e}")
        return False


def run_migrations():
    """Run Django migrations on the test database"""
    print("\n🔧 Running migrations...")
    
    # Set environment to use local settings
    os.environ['DJANGO_SETTINGS_MODULE'] = 'pyfactor.settings'
    
    # Load environment variables from .env.local
    from dotenv import load_dotenv
    env_path = project_root / '.env.local'
    load_dotenv(env_path, override=True)
    
    # Run migrations
    try:
        subprocess.run(
            [sys.executable, 'manage.py', 'migrate', '--no-input'],
            cwd=project_root,
            check=True,
            env={**os.environ, 'DJANGO_SETTINGS_MODULE': 'pyfactor.settings'}
        )
        print("✅ Migrations completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Migration failed: {e}")
        return False


def check_migration_status():
    """Check the status of migrations"""
    print("\n📊 Checking migration status...")
    
    try:
        subprocess.run(
            [sys.executable, 'manage.py', 'showmigrations'],
            cwd=project_root,
            env={**os.environ, 'DJANGO_SETTINGS_MODULE': 'pyfactor.settings'}
        )
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to check migration status: {e}")


def main():
    """Main function to set up local testing"""
    print("🚀 Setting up local testing environment for Django migrations")
    print("=" * 60)
    
    # Step 1: Create local environment file
    create_local_env_file()
    
    # Step 2: Fix migration file
    if not fix_migration_file():
        print("❌ Failed to fix migration file. Exiting.")
        return 1
    
    # Step 3: Create test database
    if not create_test_database():
        print("❌ Failed to create test database. Exiting.")
        return 1
    
    # Step 4: Run migrations
    if not run_migrations():
        print("❌ Failed to run migrations. Exiting.")
        return 1
    
    # Step 5: Check migration status
    check_migration_status()
    
    print("\n✅ Local testing environment set up successfully!")
    print("\nTo use this environment:")
    print("1. Export environment: export $(cat .env.local | xargs)")
    print("2. Run Django commands: python manage.py <command>")
    print("3. Run tests: python manage.py test")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())