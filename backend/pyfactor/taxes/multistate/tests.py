"""
Tests for multi-state tax operations.
"""

from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from custom_auth.models import Tenant
from .models import MultistateNexusProfile, StateNexusStatus, BusinessActivity
from .nexus_tracker import NexusTracker, NexusActivity, ActivityType, TaxType
from .apportionment_calculator import ApportionmentCalculator

User = get_user_model()


class NexusTrackerTestCase(TestCase):
    """Test cases for nexus tracking functionality"""
    
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Test Tenant", slug="test-tenant")
        self.nexus_tracker = NexusTracker(tenant_id=str(self.tenant.id))
    
    def test_economic_nexus_calculation(self):
        """Test economic nexus threshold calculation"""
        # Test California economic nexus ($500k threshold)
        sales_data = {
            'sales': Decimal('600000'),  # Above threshold
            'transactions': 150
        }
        
        has_nexus, analysis = self.nexus_tracker.check_economic_nexus('CA', sales_data)
        
        self.assertTrue(has_nexus)
        self.assertIn('Sales exceed $500,000.00', analysis['reasons'])
        self.assertEqual(analysis['state'], 'CA')
    
    def test_physical_presence_nexus(self):
        """Test physical presence nexus determination"""
        # Add an office activity
        office_activity = NexusActivity(
            activity_type=ActivityType.OFFICE,
            state='NY',
            start_date=date.today() - timedelta(days=30),
            description='Main office location'
        )
        self.nexus_tracker.add_activity(office_activity)
        
        has_nexus, analysis = self.nexus_tracker.check_physical_presence_nexus('NY')
        
        self.assertTrue(has_nexus)
        self.assertEqual(len(analysis['nexus_activities']), 1)
        self.assertIn('office', analysis['reasons'][0])
    
    def test_no_nexus_scenario(self):
        """Test scenario where no nexus is established"""
        sales_data = {
            'sales': Decimal('50000'),  # Below threshold
            'transactions': 50
        }
        
        has_nexus, analysis = self.nexus_tracker.check_economic_nexus('CA', sales_data)
        
        self.assertFalse(has_nexus)
        self.assertEqual(len(analysis['reasons']), 0)


class ApportionmentCalculatorTestCase(TestCase):
    """Test cases for apportionment calculation functionality"""
    
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Test Tenant", slug="test-tenant")
        self.calculator = ApportionmentCalculator(tenant_id=str(self.tenant.id))
    
    def test_sales_factor_calculation(self):
        """Test sales factor calculation"""
        state_sales = Decimal('1000000')
        total_sales = Decimal('5000000')
        
        sales_factor = self.calculator.calculate_sales_factor('CA', state_sales, total_sales)
        
        self.assertEqual(sales_factor, Decimal('0.200000'))  # 20%
    
    def test_apportionment_percentage_calculation(self):
        """Test final apportionment percentage calculation"""
        sales_factor = Decimal('0.3')
        payroll_factor = Decimal('0.2')
        property_factor = Decimal('0.1')
        
        # Test California (single sales factor)
        apportionment = self.calculator.calculate_apportionment_percentage(
            'CA', sales_factor, payroll_factor, property_factor
        )
        
        # California uses 100% sales factor weighting
        self.assertEqual(apportionment, Decimal('0.300000'))
    
    def test_throwback_sales_calculation(self):
        """Test sales factor with throwback rules"""
        state_sales = Decimal('1000000')
        total_sales = Decimal('5000000')
        throwback_sales = Decimal('500000')
        
        # Test throwback state calculation
        sales_factor = self.calculator.calculate_sales_factor(
            'CA', state_sales, total_sales, throwback_sales
        )
        
        # With throwback, both numerator and denominator increase
        expected_factor = (state_sales + throwback_sales) / total_sales
        self.assertEqual(sales_factor, expected_factor)
    
    def test_multistate_apportionment_calculation(self):
        """Test complete multistate apportionment calculation"""
        business_data = {
            'states': ['CA', 'NY', 'TX'],
            'total_sales': Decimal('10000000'),
            'total_payroll': Decimal('2000000'),
            'total_property': Decimal('1000000'),
            'CA_sales': Decimal('5000000'),
            'CA_payroll': Decimal('1000000'),
            'CA_property': Decimal('500000'),
            'NY_sales': Decimal('3000000'),
            'NY_payroll': Decimal('600000'),
            'NY_property': Decimal('300000'),
            'TX_sales': Decimal('2000000'),
            'TX_payroll': Decimal('400000'),
            'TX_property': Decimal('200000'),
            'nowhere_sales': Decimal('0'),
            'calculation_date': date.today()
        }
        
        factors = self.calculator.calculate_multistate_apportionment(business_data)
        
        # Check that all states have factors calculated
        self.assertIn('CA', factors.apportionment_percentage)
        self.assertIn('NY', factors.apportionment_percentage)
        self.assertIn('TX', factors.apportionment_percentage)
        
        # Check sales factors
        self.assertEqual(factors.sales_factor['CA'], Decimal('0.500000'))  # 50%
        self.assertEqual(factors.sales_factor['NY'], Decimal('0.300000'))  # 30%
        self.assertEqual(factors.sales_factor['TX'], Decimal('0.200000'))  # 20%


class MultistateNexusAPITestCase(APITestCase):
    """Test cases for multistate nexus API endpoints"""
    
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Test Tenant", slug="test-tenant")
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            tenant=self.tenant
        )
        self.client.force_authenticate(user=self.user)
    
    def test_create_nexus_profile(self):
        """Test creating a multistate nexus profile"""
        data = {
            'business_name': 'Test Business',
            'federal_ein': '12-3456789',
            'home_state': 'CA',
            'business_type': 'LLC',
            'preferred_filing_method': 'separate',
            'enable_nexus_monitoring': True
        }
        
        response = self.client.post('/api/taxes/multistate/nexus-profiles/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['business_name'], 'Test Business')
        self.assertEqual(response.data['home_state'], 'CA')
    
    def test_add_business_activity(self):
        """Test adding a business activity"""
        # First create a nexus profile
        nexus_profile = MultistateNexusProfile.objects.create(
            tenant=self.tenant,
            business_name='Test Business',
            home_state='CA'
        )
        
        data = {
            'nexus_profile': nexus_profile.id,
            'activity_type': 'office',
            'state': 'NY',
            'description': 'New York office location',
            'start_date': '2024-01-01',
            'address': '123 Main St',
            'city': 'New York',
            'zip_code': '10001'
        }
        
        response = self.client.post('/api/taxes/multistate/business-activities/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['activity_type'], 'office')
        self.assertEqual(response.data['state'], 'NY')
    
    def test_nexus_analysis_endpoint(self):
        """Test the nexus analysis endpoint"""
        # Create nexus profile
        nexus_profile = MultistateNexusProfile.objects.create(
            tenant=self.tenant,
            business_name='Test Business',
            home_state='CA'
        )
        
        # Create business activity
        BusinessActivity.objects.create(
            nexus_profile=nexus_profile,
            activity_type='office',
            state='NY',
            description='Office location',
            start_date=date.today() - timedelta(days=30),
            creates_nexus=True,
            is_active=True
        )
        
        data = {
            'states': ['CA', 'NY'],
            'sales_data': {
                'CA_sales': 600000,
                'CA_transactions': 150,
                'NY_sales': 300000,
                'NY_transactions': 75
            }
        }
        
        response = self.client.post(
            f'/api/taxes/multistate/nexus-profiles/{nexus_profile.id}/analyze_nexus/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('nexus_analysis', response.data)
        self.assertIn('compliance_requirements', response.data)
    
    def test_unauthorized_access(self):
        """Test that unauthenticated requests are rejected"""
        self.client.force_authenticate(user=None)
        
        response = self.client.get('/api/taxes/multistate/nexus-profiles/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_tenant_isolation(self):
        """Test that users can only access their own tenant's data"""
        # Create another tenant and user
        other_tenant = Tenant.objects.create(name="Other Tenant", slug="other-tenant")
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            tenant=other_tenant
        )
        
        # Create nexus profile for other tenant
        other_profile = MultistateNexusProfile.objects.create(
            tenant=other_tenant,
            business_name='Other Business',
            home_state='TX'
        )
        
        # Try to access other tenant's profile
        response = self.client.get(f'/api/taxes/multistate/nexus-profiles/{other_profile.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class StateNexusConfigTestCase(TestCase):
    """Test cases for state nexus configuration"""
    
    def test_state_threshold_configuration(self):
        """Test that state threshold configurations are correct"""
        from .nexus_tracker import StateNexusConfig
        
        config = StateNexusConfig()
        
        # Test California thresholds
        ca_thresholds = config.ECONOMIC_NEXUS_THRESHOLDS['CA']
        self.assertEqual(ca_thresholds['sales'], Decimal('500000'))
        self.assertIsNone(ca_thresholds['transactions'])
        
        # Test New York thresholds
        ny_thresholds = config.ECONOMIC_NEXUS_THRESHOLDS['NY']
        self.assertEqual(ny_thresholds['sales'], Decimal('500000'))
        self.assertEqual(ny_thresholds['transactions'], 100)
        
        # Test states with no sales tax
        mt_thresholds = config.ECONOMIC_NEXUS_THRESHOLDS['MT']
        self.assertIsNone(mt_thresholds['sales'])
        self.assertIsNone(mt_thresholds['transactions'])
    
    def test_income_tax_nexus_thresholds(self):
        """Test income tax nexus threshold configuration"""
        from .nexus_tracker import StateNexusConfig
        
        config = StateNexusConfig()
        
        # Test California income tax thresholds
        ca_income_thresholds = config.INCOME_TAX_NEXUS_THRESHOLDS['CA']
        self.assertEqual(ca_income_thresholds['sales'], Decimal('500000'))
        self.assertEqual(ca_income_thresholds['property'], Decimal('50000'))
        self.assertEqual(ca_income_thresholds['payroll'], Decimal('50000'))


class ApportionmentStateConfigTestCase(TestCase):
    """Test cases for state apportionment configuration"""
    
    def test_state_apportionment_methods(self):
        """Test state apportionment method configuration"""
        from .apportionment_calculator import StateApportionmentConfig
        
        config = StateApportionmentConfig()
        
        # Test California (single sales factor)
        ca_config = config.STATE_CONFIGS['CA']
        self.assertEqual(ca_config['sales_weight'], Decimal('1.0'))
        self.assertEqual(ca_config['payroll_weight'], Decimal('0.0'))
        self.assertEqual(ca_config['property_weight'], Decimal('0.0'))
        
        # Test Pennsylvania (double-weighted sales)
        pa_config = config.STATE_CONFIGS['PA']
        self.assertEqual(pa_config['sales_weight'], Decimal('0.5'))
        self.assertEqual(pa_config['payroll_weight'], Decimal('0.25'))
        self.assertEqual(pa_config['property_weight'], Decimal('0.25'))
    
    def test_throwback_rules(self):
        """Test throwback rule configuration"""
        from .apportionment_calculator import StateApportionmentConfig, ThrowbackRule
        
        config = StateApportionmentConfig()
        
        # Test California (throwback state)
        ca_config = config.STATE_CONFIGS['CA']
        self.assertEqual(ca_config['throwback_rule'], ThrowbackRule.THROWBACK)
        
        # Test Ohio (throwout state)
        oh_config = config.STATE_CONFIGS['OH']
        self.assertEqual(oh_config['throwback_rule'], ThrowbackRule.THROWOUT)
        
        # Test Texas (no throwback/throwout)
        tx_config = config.STATE_CONFIGS['TX']
        self.assertEqual(tx_config['throwback_rule'], ThrowbackRule.NO_RULE)