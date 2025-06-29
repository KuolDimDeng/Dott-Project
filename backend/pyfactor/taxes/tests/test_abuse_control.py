# taxes/tests/test_abuse_control.py
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from custom_auth.models import Tenant
from taxes.models import (
    TaxDataEntryControl, TaxDataEntryLog, 
    TaxDataAbuseReport, TaxDataBlacklist
)
from taxes.services.abuse_control_service import TaxDataAbuseControlService
import uuid

User = get_user_model()


class TaxAbuseControlTestCase(TransactionTestCase):
    """Test case for tax data abuse control functionality"""
    
    def setUp(self):
        # Create test tenant
        self.tenant = Tenant.objects.create(
            id=uuid.uuid4(),
            name="Test Company",
            owner_id="test_owner"
        )
        
        # Create test user
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            tenant=self.tenant
        )
        
        # Create API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Test IP address
        self.test_ip = "192.168.1.1"
        
    def test_rate_limit_creation(self):
        """Test that rate limit controls can be created"""
        control = TaxDataEntryControl.objects.create(
            tenant_id=self.tenant.id,
            control_type='income_tax_rates',
            max_entries_per_hour=50,
            max_entries_per_day=500,
            max_entries_per_month=5000
        )
        
        self.assertEqual(control.control_type, 'income_tax_rates')
        self.assertEqual(control.max_entries_per_hour, 50)
        self.assertTrue(control.is_active)
        
    def test_rate_limit_check(self):
        """Test rate limit checking logic"""
        # Create control with low limits
        control = TaxDataEntryControl.objects.create(
            tenant_id=self.tenant.id,
            control_type='income_tax_rates',
            max_entries_per_hour=5,
            max_entries_per_day=10,
            max_entries_per_month=100
        )
        
        # Test within limits
        allowed, error = TaxDataAbuseControlService.check_rate_limit(
            self.tenant.id, 'income_tax_rates', self.user, self.test_ip, 1
        )
        self.assertTrue(allowed)
        self.assertIsNone(error)
        
        # Create entries to exceed hourly limit
        for i in range(5):
            TaxDataEntryLog.objects.create(
                tenant_id=self.tenant.id,
                control_type='income_tax_rates',
                entry_type='create',
                user=self.user,
                ip_address=self.test_ip,
                user_agent='Test Agent',
                status='allowed',
                entry_count=1
            )
        
        # Test exceeding hourly limit
        allowed, error = TaxDataAbuseControlService.check_rate_limit(
            self.tenant.id, 'income_tax_rates', self.user, self.test_ip, 1
        )
        self.assertFalse(allowed)
        self.assertIn('Hourly rate limit exceeded', error)
        
    def test_blacklist_functionality(self):
        """Test blacklist creation and checking"""
        # Add user to blacklist
        blacklist_entry = TaxDataAbuseControlService.add_to_blacklist(
            'user', str(self.user.id), 'Test blacklist', self.user
        )
        
        self.assertEqual(blacklist_entry.blacklist_type, 'user')
        self.assertTrue(blacklist_entry.is_active)
        
        # Test blacklist check
        is_blacklisted = TaxDataAbuseControlService._is_blacklisted(
            self.tenant.id, self.user, self.test_ip
        )
        self.assertTrue(is_blacklisted)
        
        # Remove from blacklist
        TaxDataAbuseControlService.remove_from_blacklist('user', str(self.user.id))
        
        # Test blacklist check again
        is_blacklisted = TaxDataAbuseControlService._is_blacklisted(
            self.tenant.id, self.user, self.test_ip
        )
        self.assertFalse(is_blacklisted)
        
    def test_abuse_report_creation(self):
        """Test abuse report creation"""
        report = TaxDataAbuseReport.objects.create(
            tenant_id=self.tenant.id,
            report_type='Excessive API calls',
            severity='high',
            user=self.user,
            description='User making too many API calls',
            evidence={'call_count': 1000}
        )
        
        self.assertEqual(report.status, 'pending')
        self.assertEqual(report.severity, 'high')
        
        # Test report resolution
        report.status = 'resolved'
        report.action_taken = 'User warned and rate limits reduced'
        report.resolved_by = self.user
        report.save()
        
        self.assertEqual(report.status, 'resolved')
        self.assertIsNotNone(report.action_taken)
        
    def test_api_endpoint_with_rate_limit(self):
        """Test actual API endpoint with rate limiting"""
        # Create a low rate limit
        control = TaxDataEntryControl.objects.create(
            tenant_id=self.tenant.id,
            control_type='income_tax_rates',
            max_entries_per_hour=2,
            max_entries_per_day=10,
            max_entries_per_month=100
        )
        
        # Note: This is a basic test structure. In a real scenario,
        # you would need to set up proper tenant context and test
        # the actual API endpoints with rate limiting applied.