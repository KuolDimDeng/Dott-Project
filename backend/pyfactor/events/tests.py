from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from datetime import datetime, timedelta
from django.utils import timezone
from .models import Event
from custom_auth.models import Tenant
import uuid

User = get_user_model()


class EventModelTest(TestCase):
    """Test Event model functionality."""
    
    def setUp(self):
        self.tenant = Tenant.objects.create(
            name="Test Company",
            owner_id="test_owner"
        )
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            tenant=self.tenant
        )
    
    def test_create_event(self):
        """Test creating an event."""
        event = Event.objects.create(
            title="Test Meeting",
            start_datetime=timezone.now(),
            end_datetime=timezone.now() + timedelta(hours=1),
            event_type="meeting",
            tenant_id=self.tenant.id,
            created_by=self.user
        )
        
        self.assertEqual(event.title, "Test Meeting")
        self.assertEqual(event.tenant_id, self.tenant.id)
        self.assertEqual(event.created_by, self.user)
    
    def test_event_validation(self):
        """Test that end_datetime must be after start_datetime."""
        with self.assertRaises(Exception):
            Event.objects.create(
                title="Invalid Event",
                start_datetime=timezone.now(),
                end_datetime=timezone.now() - timedelta(hours=1),  # Before start
                tenant_id=self.tenant.id,
                created_by=self.user
            )


class EventAPITest(APITestCase):
    """Test Event API endpoints."""
    
    def setUp(self):
        self.tenant = Tenant.objects.create(
            name="Test Company",
            owner_id="test_owner"
        )
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            tenant=self.tenant
        )
        self.client.force_authenticate(user=self.user)
        
        # Create test event
        self.event = Event.objects.create(
            title="Test Event",
            start_datetime=timezone.now(),
            end_datetime=timezone.now() + timedelta(hours=2),
            event_type="meeting",
            tenant_id=self.tenant.id,
            created_by=self.user
        )
    
    def test_list_events(self):
        """Test listing events for tenant."""
        response = self.client.get('/api/calendar/events/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_create_event(self):
        """Test creating a new event."""
        data = {
            'title': 'New Meeting',
            'start_datetime': (timezone.now() + timedelta(days=1)).isoformat(),
            'end_datetime': (timezone.now() + timedelta(days=1, hours=1)).isoformat(),
            'event_type': 'meeting',
            'all_day': False,
            'reminder_minutes': 15
        }
        response = self.client.post('/api/calendar/events/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Meeting')
        
    def test_update_event(self):
        """Test updating an event."""
        data = {'title': 'Updated Event'}
        response = self.client.patch(f'/api/calendar/events/{self.event.id}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated Event')
    
    def test_delete_event(self):
        """Test deleting an event."""
        response = self.client.delete(f'/api/calendar/events/{self.event.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Event.objects.filter(id=self.event.id).exists())
    
    def test_tenant_isolation(self):
        """Test that users can't access events from other tenants."""
        # Create another tenant and user
        other_tenant = Tenant.objects.create(
            name="Other Company",
            owner_id="other_owner"
        )
        other_user = User.objects.create_user(
            email="other@example.com",
            password="otherpass123",
            tenant=other_tenant
        )
        
        # Create event in other tenant
        other_event = Event.objects.create(
            title="Other Tenant Event",
            start_datetime=timezone.now(),
            end_datetime=timezone.now() + timedelta(hours=1),
            tenant_id=other_tenant.id,
            created_by=other_user
        )
        
        # Try to access other tenant's event
        response = self.client.get(f'/api/calendar/events/{other_event.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)