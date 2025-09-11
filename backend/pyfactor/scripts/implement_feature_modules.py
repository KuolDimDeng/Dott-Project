#!/usr/bin/env python
"""
Complete implementation script for à la carte feature modules.
This script handles all necessary setup and testing for the feature module system.
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, timedelta

# Add the project root to the Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from django.contrib.auth import get_user_model
from users.models import Business, FeatureModule, BusinessFeatureModule, FeatureBillingEvent
from users.services.proration_service import ProrationService, TEST_ACCOUNTS, TESTING_MODE
from users.services.feature_access_service import FeatureAccessService

User = get_user_model()

def check_system_status():
    """Check the current status of the feature module system"""
    print("\n🔍 SYSTEM STATUS CHECK")
    print("=" * 50)
    
    # Check if models exist
    try:
        feature_count = FeatureModule.objects.count()
        print(f"✅ FeatureModule model exists - {feature_count} features defined")
        
        business_feature_count = BusinessFeatureModule.objects.count()
        print(f"✅ BusinessFeatureModule model exists - {business_feature_count} assignments")
        
        billing_event_count = FeatureBillingEvent.objects.count()
        print(f"✅ FeatureBillingEvent model exists - {billing_event_count} events")
    except Exception as e:
        print(f"❌ Model check failed: {e}")
        return False
    
    # Check testing mode
    print(f"\n📋 Configuration:")
    print(f"  - Testing Mode: {'ON' if TESTING_MODE else 'OFF'}")
    print(f"  - Test Accounts: {TEST_ACCOUNTS}")
    
    # Check core features
    from users.services.feature_access_service import CORE_FEATURES
    print(f"\n🆓 Core Features (Always Free):")
    for feature in CORE_FEATURES:
        print(f"  - {feature}")
    
    return True

def list_available_features():
    """List all available features and their pricing"""
    print("\n💰 FEATURE CATALOG")
    print("=" * 50)
    
    features = FeatureModule.objects.all().order_by('category', 'name')
    
    if not features:
        print("❌ No features found. Run migrations first!")
        return
    
    current_category = None
    for feature in features:
        if feature.category != current_category:
            current_category = feature.category
            print(f"\n📁 {current_category.upper()}")
        
        status = "🆓 CORE" if feature.is_core else f"💵 ${feature.monthly_price}/mo"
        dev_price = f"(${feature.developing_country_price} developing)" if not feature.is_core else ""
        print(f"  - {feature.name} ({feature.code}): {status} {dev_price}")
        if feature.description:
            print(f"    {feature.description}")

def test_proration_calculations():
    """Test proration calculations for different scenarios"""
    print("\n🧮 TESTING PRORATION CALCULATIONS")
    print("=" * 50)
    
    # Get or create a test user and business
    test_user, created = User.objects.get_or_create(
        email='test_proration@example.com',
        defaults={'username': 'test_proration'}
    )
    
    if not hasattr(test_user, 'business'):
        Business.objects.create(
            user=test_user,
            business_name='Test Proration Business',
            business_type='SERVICE'
        )
    
    # Get a paid feature
    payroll = FeatureModule.objects.filter(code='payroll').first()
    if not payroll:
        print("❌ Payroll feature not found")
        return
    
    print(f"\n📊 Testing with feature: {payroll.name} (${payroll.monthly_price}/mo)")
    
    # Test adding feature mid-month
    proration_add = ProrationService.calculate_proration(test_user, payroll, 'add')
    print(f"\n➕ Adding feature mid-month:")
    print(f"  - Amount: ${proration_add['amount']}")
    print(f"  - Description: {proration_add['description']}")
    print(f"  - Days remaining: {proration_add['days_remaining']}")
    print(f"  - Days in period: {proration_add['days_in_period']}")
    print(f"  - Will charge now: {proration_add['charge_now']}")
    
    # Test removing feature
    proration_remove = ProrationService.calculate_proration(test_user, payroll, 'remove')
    print(f"\n➖ Removing feature:")
    print(f"  - Credit amount: ${proration_remove['amount']}")
    print(f"  - Description: {proration_remove['description']}")

def test_feature_access():
    """Test feature access control"""
    print("\n🔐 TESTING FEATURE ACCESS")
    print("=" * 50)
    
    # Test with regular user
    test_user = User.objects.filter(email='test_proration@example.com').first()
    if not test_user:
        print("❌ Test user not found")
        return
    
    print(f"\n👤 Testing with: {test_user.email}")
    
    # Test core features (should always be accessible)
    print("\n🆓 Core Features Access:")
    for feature in ['dashboard', 'pos', 'inventory']:
        has_access = FeatureAccessService.has_feature_access(test_user, feature)
        print(f"  - {feature}: {'✅ Access' if has_access else '❌ No Access'}")
    
    # Test paid features
    print("\n💰 Paid Features Access (in testing mode, should have access):")
    for feature in ['payroll', 'analytics', 'accounting']:
        has_access = FeatureAccessService.has_feature_access(test_user, feature)
        print(f"  - {feature}: {'✅ Access' if has_access else '❌ No Access'}")
    
    # Test with test account
    support_user = User.objects.filter(email='support@dottapps.com').first()
    if support_user:
        print(f"\n🛡️ Testing with test account: {support_user.email}")
        has_access = FeatureAccessService.has_feature_access(support_user, 'payroll')
        print(f"  - Payroll access: {'✅ Full Access (Test Account)' if has_access else '❌ Error'}")

def simulate_feature_usage():
    """Simulate a business adding and removing features"""
    print("\n🎮 SIMULATING FEATURE USAGE")
    print("=" * 50)
    
    # Get a real user or create test user
    user = User.objects.filter(email='test_simulation@example.com').first()
    if not user:
        user = User.objects.create(
            email='test_simulation@example.com',
            username='test_simulation'
        )
        Business.objects.create(
            user=user,
            business_name='Simulation Test Business',
            business_type='MIXED'
        )
    
    business = user.business
    print(f"📊 Business: {business.business_name}")
    
    # Add some features
    features_to_add = ['payroll', 'analytics', 'marketing']
    print(f"\n➕ Adding features: {features_to_add}")
    
    for feature_code in features_to_add:
        feature = FeatureModule.objects.filter(code=feature_code).first()
        if feature:
            with transaction.atomic():
                bf, created = BusinessFeatureModule.objects.get_or_create(
                    business=business,
                    feature_module=feature,
                    defaults={'enabled': True}
                )
                if created:
                    print(f"  ✅ Added {feature.name}")
                else:
                    print(f"  ℹ️  {feature.name} already enabled")
    
    # Calculate monthly total
    totals = ProrationService.calculate_monthly_total(business)
    print(f"\n💰 Monthly Billing Summary:")
    print(f"  - Base subscription: ${totals['base_price']}")
    print(f"  - Feature modules: ${totals['feature_total']}")
    print(f"  - Total monthly: ${totals['total']}")
    print(f"  - Testing mode: {totals['testing_mode']}")
    
    # List enabled features
    user_features = FeatureAccessService.get_user_features(user)
    print(f"\n📋 Enabled Features:")
    for module in user_features.get('enabled_modules', []):
        if isinstance(module, dict):
            print(f"  - {module.get('name', 'Unknown')} (${module.get('price', 0)})")
        else:
            print(f"  - {module}")

def cleanup_test_data():
    """Clean up test data created during testing"""
    print("\n🧹 CLEANUP")
    print("=" * 50)
    
    test_emails = [
        'test_proration@example.com',
        'test_simulation@example.com'
    ]
    
    for email in test_emails:
        user = User.objects.filter(email=email).first()
        if user:
            if hasattr(user, 'business'):
                # Clean up business features
                BusinessFeatureModule.objects.filter(business=user.business).delete()
                FeatureBillingEvent.objects.filter(business=user.business).delete()
                user.business.delete()
            user.delete()
            print(f"  ✅ Cleaned up {email}")

def main():
    """Main execution function"""
    print("\n" + "=" * 60)
    print("À LA CARTE FEATURE MODULE IMPLEMENTATION TEST")
    print("=" * 60)
    
    # Check system status
    if not check_system_status():
        print("\n❌ System not ready. Please run migrations first:")
        print("   python manage.py migrate")
        return
    
    # List available features
    list_available_features()
    
    # Test proration calculations
    test_proration_calculations()
    
    # Test feature access
    test_feature_access()
    
    # Simulate usage
    simulate_feature_usage()
    
    # Cleanup
    cleanup_test_data()
    
    print("\n" + "=" * 60)
    print("✅ FEATURE MODULE SYSTEM TEST COMPLETE")
    print("=" * 60)
    print("\nNext Steps:")
    print("1. Run on staging: python scripts/fix_migration_dependency.py")
    print("2. Run migrations: python manage.py migrate")
    print("3. Test the system: python scripts/implement_feature_modules.py")
    print("4. Monitor in testing mode (no charges)")
    print("5. When ready, set TESTING_MODE = False in proration_service.py")

if __name__ == "__main__":
    main()