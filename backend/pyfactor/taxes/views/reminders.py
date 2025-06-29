from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from datetime import timedelta
from ..models import TaxReminder
from ..serializers import TaxReminderSerializer
import logging

logger = logging.getLogger(__name__)


class TaxReminderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tax reminders with automatic tenant isolation.
    """
    serializer_class = TaxReminderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return reminders only for the authenticated user's tenant.
        """
        user = self.request.user
        
        # Ensure user has a tenant
        if not hasattr(user, 'tenant_id') or not user.tenant_id:
            logger.warning(f"User {user.email} has no tenant_id")
            return TaxReminder.objects.none()
        
        # Base queryset filtered by tenant
        queryset = TaxReminder.objects.filter(tenant_id=user.tenant_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by reminder type
        reminder_type = self.request.query_params.get('reminder_type')
        if reminder_type:
            queryset = queryset.filter(reminder_type=reminder_type)
        
        # Filter by date range
        from_date = self.request.query_params.get('from_date')
        to_date = self.request.query_params.get('to_date')
        if from_date:
            queryset = queryset.filter(due_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(due_date__lte=to_date)
        
        return queryset.order_by('due_date')
    
    def perform_create(self, serializer):
        """
        Automatically set tenant when creating a reminder.
        """
        user = self.request.user
        if not hasattr(user, 'tenant_id') or not user.tenant_id:
            raise PermissionDenied("User is not associated with any organization")
        
        serializer.save(tenant_id=user.tenant_id)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark a reminder as completed"""
        reminder = self.get_object()
        
        if reminder.status == 'completed':
            return Response(
                {"error": "This reminder is already completed"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reminder.status = 'completed'
        reminder.save()
        
        serializer = self.get_serializer(reminder)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming reminders for the next 30 days"""
        end_date = timezone.now().date() + timedelta(days=30)
        
        reminders = self.get_queryset().filter(
            status='pending',
            due_date__lte=end_date,
            due_date__gte=timezone.now().date()
        )
        
        serializer = self.get_serializer(reminders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue reminders"""
        reminders = self.get_queryset().filter(
            status='pending',
            due_date__lt=timezone.now().date()
        )
        
        # Update status to overdue
        reminders.update(status='overdue')
        
        serializer = self.get_serializer(reminders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Create multiple reminders at once"""
        reminders_data = request.data.get('reminders', [])
        
        if not isinstance(reminders_data, list):
            return Response(
                {"error": "reminders must be a list"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = self.request.user
        if not hasattr(user, 'tenant_id') or not user.tenant_id:
            raise PermissionDenied("User is not associated with any organization")
        
        created_reminders = []
        errors = []
        
        for idx, reminder_data in enumerate(reminders_data):
            reminder_data['tenant_id'] = user.tenant_id
            serializer = self.get_serializer(data=reminder_data)
            
            if serializer.is_valid():
                serializer.save()
                created_reminders.append(serializer.data)
            else:
                errors.append({
                    'index': idx,
                    'errors': serializer.errors
                })
        
        response_data = {
            'created': created_reminders,
            'errors': errors
        }
        
        if errors:
            return Response(response_data, status=status.HTTP_207_MULTI_STATUS)
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get a summary of reminders by status and type"""
        from django.db.models import Count
        
        queryset = self.get_queryset()
        
        summary = {
            'by_status': list(queryset.values('status').annotate(count=Count('id'))),
            'by_type': list(queryset.values('reminder_type').annotate(count=Count('id'))),
            'total': queryset.count(),
            'pending': queryset.filter(status='pending').count(),
            'overdue': queryset.filter(
                status='pending',
                due_date__lt=timezone.now().date()
            ).count()
        }
        
        return Response(summary)