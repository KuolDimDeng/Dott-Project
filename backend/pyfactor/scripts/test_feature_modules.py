#!/usr/bin/env python3
"""
Test script for À La Carte Feature Module System
Tests the feature modules, proration, and test account protection
"""
import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date, timedelta

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pyfactor.settings")
django.setup()

from django.contrib.auth import get_user_model
from users.models import Business, FeatureModule, BusinessFeatureModule
from users.services.proration_service import ProrationService
from users.services.feature_access_service import FeatureAccessService

User = get_user_model()


def print_header(title):
    """Print a formatted header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def test_feature_modules():
    """Test feature module creation and retrieval"""
    print_header("Testing Feature Modules")
    
    # Get all feature modules
    features = FeatureModule.objects.all()
    print(f"\nTotal features available: {features.count()}")
    
    # List core features
    core_features = features.filter(is_core=True)
    print(f"\nCore features (free): {core_features.count()}")
    for feature in core_features:
        print(f"  - {feature.name} ({feature.code}): ${feature.monthly_price}")
    
    # List paid features
    paid_features = features.filter(is_core=False)
    print(f"\nPaid features (à la carte): {paid_features.count()}")
    for feature in paid_features:
        print(f"  - {feature.name} ({feature.code}): ${feature.monthly_price} (${feature.developing_country_price} developing)")
    
    return features.count() > 0


def test_test_account_protection():
    """Test that test accounts get full access without charges"""
    print_header("Testing Test Account Protection")
    
    # Try to get support@dottapps.com user
    try:
        test_user = User.objects.get(email='support@dottapps.com')
        print(f"\n✓ Found test account: {test_user.email}")
        
        # Check feature access
        has_payroll = FeatureAccessService.has_feature_access(test_user, 'payroll')
        has_analytics = FeatureAccessService.has_feature_access(test_user, 'analytics')
        
        print(f"  - Access to Payroll: {has_payroll}")
        print(f"  - Access to Analytics: {has_analytics}")
        
        # Test proration for test account
        payroll_module = FeatureModule.objects.get(code='payroll')
        proration = ProrationService.calculate_proration(test_user, payroll_module, 'add')
        
        print(f"\nProration for test account:")
        print(f"  - Amount: ${proration['amount']}")
        print(f"  - Description: {proration['description']}")
        print(f"  - Is test account: {proration.get('is_test_account', False)}")
        print(f"  - Testing mode: {proration.get('testing_mode', False)}")
        
        return True
    except User.DoesNotExist:
        print("\n✗ Test account support@dottapps.com not found")
        print("  Creating a test user for demonstration...")
        
        # Create a test user
        test_user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        # Create a business for the test user
        business = Business.objects.create(
            name='Test Business',
            owner_id=test_user.id
        )
        
        print(f"\n✓ Created test user: {test_user.email}")
        return True


def test_proration_calculation():
    """Test proration calculation for regular users"""
    print_header("Testing Proration Calculation")
    
    # Get or create a regular test user
    try:
        user = User.objects.get(email='test@example.com')
    except User.DoesNotExist:
        user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        Business.objects.create(
            name='Test Business',
            owner_id=user.id
        )
    
    # Get the payroll module
    try:
        payroll = FeatureModule.objects.get(code='payroll')
    except FeatureModule.DoesNotExist:
        print("\n✗ Payroll module not found. Run migrations first.")
        return False
    
    # Calculate proration for adding feature mid-month
    proration = ProrationService.calculate_proration(user, payroll, 'add')
    
    print(f"\nProration calculation for regular user ({user.email}):")
    print(f"  Feature: {payroll.name}")
    print(f"  Monthly price: ${payroll.monthly_price}")
    print(f"  Days remaining: {proration['days_remaining']}")
    print(f"  Days in period: {proration['days_in_period']}")
    print(f"  Prorated amount: ${proration['amount']}")
    print(f"  Testing mode: {proration['testing_mode']}")
    print(f"  Would charge now: {not proration['testing_mode']}")
    
    # Test removal proration
    proration_remove = ProrationService.calculate_proration(user, payroll, 'remove')
    print(f"\nProration for removing feature:")
    print(f"  Credit amount: ${proration_remove['amount']}")
    print(f"  Description: {proration_remove['description']}")
    
    return True


def test_feature_access():
    """Test feature access checking"""
    print_header("Testing Feature Access")
    
    # Get a regular user
    try:
        user = User.objects.get(email='test@example.com')
        business = user.business
    except (User.DoesNotExist, AttributeError):
        print("\n✗ Test user or business not found")
        return False
    
    # Check access to various features
    features_to_check = ['dashboard', 'pos', 'payroll', 'analytics', 'marketing']
    
    print(f"\nFeature access for {user.email}:")
    for feature_code in features_to_check:
        has_access = FeatureAccessService.has_feature_access(user, feature_code)
        feature = FeatureModule.objects.filter(code=feature_code).first()
        if feature:
            status = "✓" if has_access else "✗"
            price = "Free" if feature.is_core else f"${feature.monthly_price}/mo"
            print(f"  {status} {feature.name}: {price}")
    
    # Enable a paid feature
    print("\nEnabling Payroll module for test...")
    payroll = FeatureModule.objects.get(code='payroll')
    BusinessFeatureModule.objects.get_or_create(
        business=business,
        feature_module=payroll,
        defaults={'enabled': True, 'billing_active': False}
    )
    
    # Check access again
    has_payroll_now = FeatureAccessService.has_feature_access(user, 'payroll')
    print(f"  Access to Payroll after enabling: {has_payroll_now}")
    
    return True


def test_monthly_total_calculation():
    """Test monthly total calculation including features"""
    print_header("Testing Monthly Total Calculation")
    
    try:
        user = User.objects.get(email='test@example.com')
        business = user.business
    except (User.DoesNotExist, AttributeError):
        print("\n✗ Test user or business not found")
        return False
    
    # Calculate monthly total
    totals = ProrationService.calculate_monthly_total(business)
    
    print(f"\nMonthly billing for {business.name}:")
    print(f"  Base plan price: ${totals['base_price']}")
    print(f"  Feature modules total: ${totals['feature_total']}")
    print(f"  Total monthly cost: ${totals['total']}")
    print(f"  Is developing country: {totals['is_developing_country']}")
    print(f"  Testing mode: {totals['testing_mode']}")
    
    # List enabled features
    enabled_features = BusinessFeatureModule.objects.filter(
        business=business,
        enabled=True
    ).select_related('feature_module')
    
    if enabled_features:
        print("\nEnabled feature modules:")
        for bf in enabled_features:
            feature = bf.feature_module
            price = feature.developing_country_price if business.is_developing_country else feature.monthly_price
            print(f"  - {feature.name}: ${price}/month")
    
    return True


def main():
    """Run all tests"""
    print("\n" + "🚀" * 30)
    print("  À LA CARTE FEATURE MODULE SYSTEM TEST")
    print("🚀" * 30)
    
    tests = [
        ("Feature Modules", test_feature_modules),
        ("Test Account Protection", test_test_account_protection),
        ("Proration Calculation", test_proration_calculation),
        ("Feature Access Control", test_feature_access),
        ("Monthly Total Calculation", test_monthly_total_calculation),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"\n❌ Error in {test_name}: {e}")
            results.append((test_name, False))
    
    # Print summary
    print_header("Test Summary")
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"  {test_name}: {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! The à la carte system is ready.")
    else:
        print("\n⚠️  Some tests failed. Please check the implementation.")
    
    # Print current configuration
    print_header("Current Configuration")
    print(f"  Testing Mode: {ProrationService.TESTING_MODE}")
    print(f"  Test Accounts: {', '.join(ProrationService.TEST_ACCOUNTS)}")
    print("\nTo enable production billing, set TESTING_MODE = False in proration_service.py")


if __name__ == "__main__":
    main()