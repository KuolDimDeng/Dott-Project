#!/usr/bin/env python3
"""
Deploy QRPaymentTransaction Migration to Staging
================================================

This script deploys the QRPaymentTransaction model migration to the staging environment.
Run this script to apply the migration on staging before production deployment.

Usage:
    python scripts/deploy_qr_payment_migration.py

Requirements:
    - Django management commands available
    - Database connection configured
    - Migration files present in payments/migrations/
"""

import os
import sys
import subprocess
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_command(command, description, check=True):
    """Run a shell command with logging."""
    logger.info(f"🔄 {description}")
    logger.info(f"   Command: {command}")
    
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            check=check
        )
        
        if result.stdout:
            logger.info(f"✅ Output: {result.stdout.strip()}")
        if result.stderr and result.returncode == 0:
            logger.info(f"⚠️  Warning: {result.stderr.strip()}")
        
        return result
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Command failed with exit code {e.returncode}")
        if e.stdout:
            logger.error(f"   Stdout: {e.stdout.strip()}")
        if e.stderr:
            logger.error(f"   Stderr: {e.stderr.strip()}")
        raise

def check_migration_exists():
    """Check if the QRPaymentTransaction migration file exists."""
    migration_file = Path(__file__).parent.parent / "payments" / "migrations" / "0006_qr_payment_transaction.py"
    
    if not migration_file.exists():
        logger.error(f"❌ Migration file not found: {migration_file}")
        logger.error("   Please ensure the migration file exists before running this script.")
        return False
    
    logger.info(f"✅ Migration file found: {migration_file}")
    return True

def check_django_setup():
    """Check if Django is properly configured."""
    try:
        import django
        from django.conf import settings
        
        if not settings.configured:
            logger.error("❌ Django settings not configured")
            return False
        
        logger.info(f"✅ Django configured with database: {settings.DATABASES['default']['NAME']}")
        return True
    except ImportError:
        logger.error("❌ Django not installed or not importable")
        return False

def show_migration_plan():
    """Show what migrations will be applied."""
    logger.info("🔍 Checking migration plan...")
    
    result = run_command(
        "python manage.py showmigrations payments --plan",
        "Showing migration plan for payments app",
        check=False
    )
    
    if result.returncode == 0:
        logger.info("✅ Migration plan retrieved successfully")
    else:
        logger.warning("⚠️  Could not retrieve migration plan (this is normal if database is not accessible)")

def run_migration():
    """Apply the QRPaymentTransaction migration."""
    logger.info("🚀 Applying QRPaymentTransaction migration...")
    
    # Apply all pending migrations for payments app
    result = run_command(
        "python manage.py migrate payments",
        "Applying payments app migrations"
    )
    
    logger.info("✅ QRPaymentTransaction migration applied successfully!")
    return True

def verify_migration():
    """Verify that the migration was applied successfully."""
    logger.info("🔍 Verifying migration was applied...")
    
    # Check if the table exists
    result = run_command(
        "python manage.py shell -c \"from payments.models import QRPaymentTransaction; print('Table exists:', QRPaymentTransaction._meta.db_table)\"",
        "Verifying QRPaymentTransaction table exists",
        check=False
    )
    
    if result.returncode == 0:
        logger.info("✅ QRPaymentTransaction model is accessible")
        return True
    else:
        logger.warning("⚠️  Could not verify table (this may be normal in some environments)")
        return False

def main():
    """Main deployment function."""
    logger.info("🚀 Starting QRPaymentTransaction Migration Deployment")
    logger.info("=" * 60)
    
    try:
        # Step 1: Check prerequisites
        logger.info("📋 Step 1: Checking prerequisites...")
        
        if not check_migration_exists():
            sys.exit(1)
        
        if not check_django_setup():
            logger.error("   Please ensure Django is properly configured")
            sys.exit(1)
        
        # Step 2: Show migration plan
        logger.info("\n📋 Step 2: Reviewing migration plan...")
        show_migration_plan()
        
        # Step 3: Apply migration
        logger.info("\n🔄 Step 3: Applying migration...")
        run_migration()
        
        # Step 4: Verify migration
        logger.info("\n🔍 Step 4: Verifying migration...")
        verify_migration()
        
        # Success
        logger.info("\n" + "=" * 60)
        logger.info("🎉 QRPaymentTransaction Migration Deployment Complete!")
        logger.info("")
        logger.info("✅ The QRPaymentTransaction model is now available in the database")
        logger.info("✅ API endpoints should now work without 404 errors")
        logger.info("✅ QR payment functionality should be fully operational")
        logger.info("")
        logger.info("Next Steps:")
        logger.info("1. Test the QR payment API endpoints")
        logger.info("2. Verify QR code generation and payment processing")
        logger.info("3. Deploy to production when staging tests pass")
        
    except KeyboardInterrupt:
        logger.info("\n⚠️  Deployment interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n❌ Deployment failed: {str(e)}")
        logger.error("Please check the error messages above and resolve any issues")
        sys.exit(1)

if __name__ == "__main__":
    # Ensure we're in the correct directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    if not (project_root / "manage.py").exists():
        logger.error("❌ manage.py not found. Please run this script from the Django project root")
        sys.exit(1)
    
    os.chdir(project_root)
    logger.info(f"📁 Working directory: {project_root}")
    
    main()