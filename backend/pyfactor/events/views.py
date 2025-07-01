from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.decorators import action
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Event
from .serializers import EventSerializer
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class EventViewSet(viewsets.ModelViewSet):
    """
    Industry-standard secure event viewset with automatic tenant isolation.
    
    Security features:
    - Automatic tenant filtering based on authenticated user
    - No tenant ID required from frontend
    - Validates user belongs to tenant
    - Uses database-level RLS as additional security layer
    - Audit logging for all operations
    """
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return events only for the authenticated user's tenant.
        This is the single source of truth for tenant isolation.
        """
        user = self.request.user
        
        # Ensure user has a tenant
        if not hasattr(user, 'tenant_id') or not user.tenant_id:
            logger.warning(f"User {user.email} has no tenant_id")
            raise PermissionDenied("User is not associated with any organization")
        
        # Log access for audit trail
        logger.info(f"User {user.email} accessing events for tenant {user.tenant_id}")
        
        # Return filtered queryset - backend handles everything
        queryset = Event.objects.filter(tenant_id=user.tenant_id)
        
        # Optional filtering by date range
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        if start_date:
            try:
                start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                queryset = queryset.filter(start_datetime__gte=start_datetime)
            except ValueError:
                logger.warning(f"Invalid start_date format: {start_date}")
        
        if end_date:
            try:
                end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                queryset = queryset.filter(end_datetime__lte=end_datetime)
            except ValueError:
                logger.warning(f"Invalid end_date format: {end_date}")
        
        # Optional filtering by event type
        event_type = self.request.query_params.get('event_type', None)
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        
        return queryset.order_by('start_datetime')
    
    def perform_create(self, serializer):
        """
        Automatically set tenant and created_by when creating an event.
        Frontend doesn't need to send tenant_id.
        """
        user = self.request.user
        
        if not hasattr(user, 'tenant_id') or not user.tenant_id:
            raise PermissionDenied("User is not associated with any organization")
        
        # Log creation for audit trail
        logger.info(f"User {user.email} creating event for tenant {user.tenant_id}")
        
        # Save with tenant from authenticated user
        serializer.save(tenant_id=user.tenant_id, created_by=user)
    
    def perform_update(self, serializer):
        """
        Ensure user can only update events in their tenant.
        """
        user = self.request.user
        event = self.get_object()
        
        # Verify event belongs to user's tenant
        if str(event.tenant_id) != str(user.tenant_id):
            logger.warning(
                f"User {user.email} attempted to update event {event.id} "
                f"from different tenant {event.tenant_id}"
            )
            raise NotFound("Event not found")
        
        # Log update for audit trail
        logger.info(f"User {user.email} updating event {event.id}")
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Ensure user can only delete events in their tenant.
        """
        user = self.request.user
        
        # Verify event belongs to user's tenant
        if str(instance.tenant_id) != str(user.tenant_id):
            logger.warning(
                f"User {user.email} attempted to delete event {instance.id} "
                f"from different tenant {instance.tenant_id}"
            )
            raise NotFound("Event not found")
        
        # Log deletion for audit trail
        logger.info(f"User {user.email} deleting event {instance.id}")
        
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def upcoming(self):
        """
        Get upcoming events for the next 7 days.
        """
        user = self.request.user
        now = timezone.now()
        week_later = now + timedelta(days=7)
        
        events = self.get_queryset().filter(
            start_datetime__gte=now,
            start_datetime__lte=week_later
        )
        
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def today(self):
        """
        Get events for today.
        """
        user = self.request.user
        today = timezone.now().date()
        tomorrow = today + timedelta(days=1)
        
        events = self.get_queryset().filter(
            start_datetime__date__gte=today,
            start_datetime__date__lt=tomorrow
        )
        
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)
    
    def list(self, request, *args, **kwargs):
        """
        List events with pagination support.
        """
        # The queryset is already filtered by tenant
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        """
        Get single event with additional security check.
        """
        try:
            return super().retrieve(request, *args, **kwargs)
        except Event.DoesNotExist:
            # Don't reveal if event exists in another tenant
            raise NotFound("Event not found")