import uuid
from django.test import TestCase, override_settings
from django.db import connection
from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from banking.models import BankAccount
from custom_auth.tenant_context import set_current_tenant, clear_current_tenant

User = get_user_model()

@override_settings(DEFAULT_TENANT_ID=uuid.UUID('00000000-0000-0000-0000-000000000000'))
class TenantIsolationTest(TestCase):
    """Test tenant isolation with Row Level Security"""
    
    def setUp(self):
        # Set up PostgreSQL tenant variable
        with connection.cursor() as cursor:
            cursor.execute("SET app.current_tenant_id = 'unset'")
        
        # Create test tenants
        self.tenant1 = Tenant.objects.create(name="Tenant 1")
        self.tenant2 = Tenant.objects.create(name="Tenant 2")
        
        # Create test users
        self.user1 = User.objects.create(
            email="user1@example.com",
            password="password1",
            tenant_id=self.tenant1.id
        )
        
        self.user2 = User.objects.create(
            email="user2@example.com",
            password="password2",
            tenant_id=self.tenant2.id
        )
        
        # Create an admin user without tenant
        self.admin_user = User.objects.create(
            email="admin@example.com",
            password="adminpass",
            is_staff=True,
            is_superuser=True
        )
        
        # Create test bank accounts for each tenant
        with connection.cursor() as cursor:
            cursor.execute(f"SET app.current_tenant_id = '{self.tenant1.id}'")
            
        self.account1 = BankAccount.objects.create(
            name="Account 1",
            account_number="123456789",
            account_type="Checking",
            balance=1000.00,
            currency="USD",
            is_active=True,
            user=self.user1,
            tenant_id=self.tenant1.id
        )
        
        with connection.cursor() as cursor:
            cursor.execute(f"SET app.current_tenant_id = '{self.tenant2.id}'")
            
        self.account2 = BankAccount.objects.create(
            name="Account 2",
            account_number="987654321",
            account_type="Savings",
            balance=2000.00,
            currency="EUR",
            is_active=True,
            user=self.user2,
            tenant_id=self.tenant2.id
        )
        
        # Reset tenant context
        with connection.cursor() as cursor:
            cursor.execute("SET app.current_tenant_id = 'unset'")
    
    def tearDown(self):
        # Clear tenant context
        clear_current_tenant()
        
        # Clean up
        with connection.cursor() as cursor:
            cursor.execute("SET app.current_tenant_id = 'unset'")
    
    def test_tenant_isolation(self):
        """Test that each tenant can only see their own accounts"""
        # Set tenant context to tenant1
        set_current_tenant(self.tenant1.id)
        
        # Tenant1 should see account1 but not account2
        accounts = BankAccount.objects.all()
        self.assertEqual(accounts.count(), 1)
        self.assertEqual(accounts.first().id, self.account1.id)
        
        # Set tenant context to tenant2
        set_current_tenant(self.tenant2.id)
        
        # Tenant2 should see account2 but not account1
        accounts = BankAccount.objects.all()
        self.assertEqual(accounts.count(), 1)
        self.assertEqual(accounts.first().id, self.account2.id)
    
    def test_admin_access(self):
        """Test that admin users can see all accounts"""
        # Using all_objects manager should bypass tenant filtering
        accounts = BankAccount.all_objects.all()
        self.assertEqual(accounts.count(), 2)
    
    def test_tenant_data_creation(self):
        """Test creating data with tenant context"""
        # Set tenant context to tenant1
        set_current_tenant(self.tenant1.id)
        
        # Create a new account for tenant1
        new_account = BankAccount.objects.create(
            name="New Account",
            account_number="555555555",
            account_type="Investment",
            balance=5000.00,
            currency="GBP",
            is_active=True,
            user=self.user1
        )
        
        # The account should have tenant1's ID
        self.assertEqual(new_account.tenant_id, self.tenant1.id)
        
        # Set tenant context to tenant2
        set_current_tenant(self.tenant2.id)
        
        # Tenant2 should not see the new account
        accounts = BankAccount.objects.filter(name="New Account")
        self.assertEqual(accounts.count(), 0)
        
        # But tenant1 should see it
        set_current_tenant(self.tenant1.id)
        accounts = BankAccount.objects.filter(name="New Account")
        self.assertEqual(accounts.count(), 1) 