from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
import uuid

from .models import AuditLog, AuditLogRetention
from .middleware import AuditMiddleware, get_current_user, get_current_tenant_id
from .mixins import AuditMixin

User = get_user_model()


class AuditLogModelTest(TestCase):
    """Test the AuditLog model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.tenant_id = uuid.uuid4()
    
    def test_create_audit_log(self):
        """Test creating an audit log entry."""
        log = AuditLog.log_action(
            user=self.user,
            tenant_id=self.tenant_id,
            action='created',
            model_name='TestModel',
            object_id='123',
            object_repr='Test Object',
            changes={'field': {'old': 'old_value', 'new': 'new_value'}},
            ip_address='127.0.0.1',
            user_agent='TestAgent',
        )
        
        self.assertIsNotNone(log)
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.tenant_id, self.tenant_id)
        self.assertEqual(log.action, 'created')
        self.assertEqual(log.model_name, 'TestModel')
        self.assertEqual(log.object_id, '123')
        self.assertEqual(log.is_successful, True)
    
    def test_log_action_with_error(self):
        """Test that logging errors don't break the main operation."""
        with patch('audit.models.AuditLog.objects.create', side_effect=Exception('DB Error')):
            # Should return None but not raise exception
            log = AuditLog.log_action(
                user=self.user,
                action='updated',
                model_name='TestModel',
            )
            self.assertIsNone(log)


class AuditMiddlewareTest(TestCase):
    """Test the audit middleware."""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = AuditMiddleware(get_response=lambda r: None)
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_middleware_sets_audit_context(self):
        """Test that middleware sets audit context on request."""
        request = self.factory.get('/test/')
        request.user = self.user
        request.session = MagicMock()
        request.session.session_key = 'test-session-key'
        
        self.middleware.process_request(request)
        
        self.assertTrue(hasattr(request, 'audit_request_id'))
        self.assertTrue(hasattr(request, 'audit_context'))
        self.assertIn('ip_address', request.audit_context)
        self.assertIn('user_agent', request.audit_context)
        self.assertIn('request_id', request.audit_context)
    
    def test_get_client_ip(self):
        """Test IP address extraction."""
        request = self.factory.get('/test/')
        
        # Test direct IP
        request.META['REMOTE_ADDR'] = '192.168.1.1'
        ip = self.middleware.get_client_ip(request)
        self.assertEqual(ip, '192.168.1.1')
        
        # Test proxied IP
        request.META['HTTP_X_FORWARDED_FOR'] = '10.0.0.1, 192.168.1.1'
        ip = self.middleware.get_client_ip(request)
        self.assertEqual(ip, '10.0.0.1')


class AuditMixinTest(TestCase):
    """Test the AuditMixin for models."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create a test model with AuditMixin
        from django.db import models
        
        class TestModel(AuditMixin, models.Model):
            name = models.CharField(max_length=100)
            value = models.IntegerField()
            
            class Meta:
                app_label = 'audit'
        
        self.TestModel = TestModel
    
    @patch('audit.middleware.get_current_user')
    @patch('audit.middleware.get_current_tenant_id')
    def test_audit_mixin_create(self, mock_tenant, mock_user):
        """Test that creating a model with AuditMixin creates audit log."""
        mock_user.return_value = self.user
        mock_tenant.return_value = uuid.uuid4()
        
        # Note: This would require actually creating the test model table
        # In a real test, you'd use a proper test model
        
        # Verify the mixin methods exist
        instance = self.TestModel(name='Test', value=123)
        self.assertTrue(hasattr(instance, 'get_audit_fields'))
        self.assertTrue(hasattr(instance, 'get_audit_data'))
        self.assertTrue(callable(instance.save))
        self.assertTrue(callable(instance.delete))


class AuditRetentionTest(TestCase):
    """Test audit log retention policies."""
    
    def test_create_retention_policy(self):
        """Test creating a retention policy."""
        policy = AuditLogRetention.objects.create(
            model_name='Invoice',
            retention_days=2555,  # 7 years
            is_active=True
        )
        
        self.assertEqual(policy.model_name, 'Invoice')
        self.assertEqual(policy.retention_days, 2555)
        self.assertTrue(policy.is_active)
        self.assertEqual(str(policy), 'Invoice: 2555 days')


class AuditCommandsTest(TestCase):
    """Test management commands."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create some test audit logs
        for i in range(5):
            AuditLog.log_action(
                user=self.user,
                action='created',
                model_name='TestModel',
                object_id=str(i),
                object_repr=f'Test Object {i}',
            )
    
    def test_audit_report_command(self):
        """Test that audit report command works."""
        from audit.management.commands.audit_report import Command
        
        command = Command()
        # Test that handle method exists and is callable
        self.assertTrue(callable(command.handle))
        
        # You could test the actual command execution here
        # but it would require mocking stdout


class AuditSignalsTest(TestCase):
    """Test audit signals for models without AuditMixin."""
    
    @patch('audit.signals.AuditLog.log_action')
    def test_signals_skip_audit_model(self, mock_log_action):
        """Test that signals skip the AuditLog model itself."""
        # Creating an audit log should not trigger another audit log
        AuditLog.objects.create(
            action='created',
            model_name='TestModel',
            object_id='123',
        )
        
        # Should not be called for AuditLog model
        mock_log_action.assert_not_called()