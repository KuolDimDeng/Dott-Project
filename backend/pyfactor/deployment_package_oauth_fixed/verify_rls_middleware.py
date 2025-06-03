#!/usr/bin/env python3
"""
RLS Middleware Verification Script

This script checks if the RLS middleware is properly configured in Django settings
and provides instructions for fixing it if not.

Usage:
  python verify_rls_middleware.py

Author: Claude AI Assistant
Date: 2025-04-19
"""

import os
import sys
import django
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s',
)
logger = logging.getLogger('rls_verify')

# Set up Django environment
sys.path.append(str(Path(__file__).parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings

def verify_settings():
    """Verify RLS middleware configuration in Django settings"""
    
    # Check for the standard RLS middleware
    standard_middleware = 'custom_auth.rls_middleware.RowLevelSecurityMiddleware'
    
    # Check for the enhanced RLS middleware
    enhanced_middleware = 'custom_auth.enhanced_rls_middleware.EnhancedRowLevelSecurityMiddleware'
    
    middleware_list = getattr(settings, 'MIDDLEWARE', [])
    
    standard_found = standard_middleware in middleware_list
    enhanced_found = enhanced_middleware in middleware_list
    
    if enhanced_found:
        logger.info("✅ Enhanced RLS middleware is properly configured!")
        return True
    elif standard_found:
        logger.info("⚠️ Standard RLS middleware is configured, but not the enhanced version.")
        logger.info("   Consider upgrading to the enhanced version for better production support.")
        
        # Suggest how to update the middleware
        print("\nTo upgrade to the enhanced middleware, edit your settings.py file:")
        print("\n1. Find this line:")
        print(f"   '{standard_middleware}',")
        print("\n2. Replace it with:")
        print(f"   '{enhanced_middleware}',")
        
        return True
    else:
        logger.error("❌ RLS middleware is NOT configured in settings!")
        
        # Provide detailed instructions to fix
        print("\nTo add RLS middleware to your project, edit your settings.py file:")
        print("\n1. Locate the MIDDLEWARE list")
        print("\n2. Add the following line near the beginning (after SecurityMiddleware):")
        print(f"   '{enhanced_middleware}',")
        
        # Find settings.py
        settings_path = Path(settings.__file__)
        if settings_path.exists():
            print(f"\nSettings file location: {settings_path}")
        
        return False

def check_database_config():
    """Check if database configuration supports RLS"""
    
    db_config = getattr(settings, 'DATABASES', {}).get('default', {})
    
    if not db_config:
        logger.error("❌ No database configuration found!")
        return False
    
    engine = db_config.get('ENGINE', '')
    
    if 'postgresql' not in engine.lower():
        logger.error(f"❌ Database engine '{engine}' may not support RLS!")
        logger.error("   RLS requires PostgreSQL database engine.")
        return False
    
    logger.info("✅ Database engine supports RLS")
    
    # Check for important connection parameters
    params = db_config.get('OPTIONS', {})
    
    if not params.get('options', ''):
        logger.warning("⚠️ Consider adding 'options: -c search_path=public' to database OPTIONS")
    
    return True

def check_environment():
    """Check for required environment variables"""
    # Check for AWS RDS environment variables if using production settings
    if getattr(settings, 'PRODUCTION', False) or getattr(settings, 'STAGING', False):
        rds_vars = ['AWS_RDS_HOST', 'AWS_RDS_PASSWORD', 'AWS_RDS_USERNAME']
        
        missing = [var for var in rds_vars if not os.environ.get(var)]
        
        if missing:
            logger.warning(f"⚠️ Missing AWS RDS environment variables: {', '.join(missing)}")
            logger.warning("   These may be needed for production RLS with AWS RDS")
    
    return True

def main():
    """Main entry point"""
    print("\n" + "=" * 60)
    print("RLS MIDDLEWARE VERIFICATION")
    print("=" * 60 + "\n")
    
    middleware_ok = verify_settings()
    db_ok = check_database_config()
    env_ok = check_environment()
    
    print("\n" + "=" * 60)
    if middleware_ok and db_ok and env_ok:
        print("✅ RLS configuration looks good!")
    else:
        print("⚠️ Some RLS configuration issues need attention!")
    print("=" * 60 + "\n")
    
    return middleware_ok and db_ok

if __name__ == "__main__":
    main() 