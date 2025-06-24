from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing audit logs.
    Only accessible to staff users.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__username', 'model_name', 'object_repr', 'ip_address']
    ordering_fields = ['timestamp', 'action', 'model_name']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """Filter audit logs based on user permissions and query parameters."""
        queryset = AuditLog.objects.all()
        
        # If user is not superuser, only show their tenant's logs
        if not self.request.user.is_superuser:
            tenant_id = getattr(self.request.user, 'tenant_id', None)
            if tenant_id:
                queryset = queryset.filter(tenant_id=tenant_id)
        
        # Filter by date range
        days = self.request.query_params.get('days')
        if days:
            try:
                days = int(days)
                start_date = timezone.now() - timedelta(days=days)
                queryset = queryset.filter(timestamp__gte=start_date)
            except ValueError:
                pass
        
        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        # Filter by model
        model = self.request.query_params.get('model')
        if model:
            queryset = queryset.filter(model_name=model)
        
        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by success status
        is_successful = self.request.query_params.get('is_successful')
        if is_successful is not None:
            queryset = queryset.filter(is_successful=is_successful.lower() == 'true')
        
        return queryset.select_related('user')
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get audit log summary statistics."""
        queryset = self.get_queryset()
        
        # Get date range
        days = int(request.query_params.get('days', 7))
        start_date = timezone.now() - timedelta(days=days)
        queryset = queryset.filter(timestamp__gte=start_date)
        
        # Calculate statistics
        total_events = queryset.count()
        
        actions_summary = list(
            queryset.values('action')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        models_summary = list(
            queryset.values('model_name')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        
        users_summary = list(
            queryset.exclude(user__isnull=True)
            .values('user__id', 'user__username')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        
        failed_operations = queryset.filter(is_successful=False).count()
        
        # Recent activity by hour
        hourly_activity = []
        for i in range(24):
            hour_start = timezone.now() - timedelta(hours=i+1)
            hour_end = timezone.now() - timedelta(hours=i)
            count = queryset.filter(
                timestamp__gte=hour_start,
                timestamp__lt=hour_end
            ).count()
            hourly_activity.append({
                'hour': hour_start.strftime('%Y-%m-%d %H:00'),
                'count': count
            })
        
        return Response({
            'period': {
                'start': start_date.isoformat(),
                'end': timezone.now().isoformat(),
                'days': days,
            },
            'total_events': total_events,
            'failed_operations': failed_operations,
            'actions_summary': actions_summary,
            'models_summary': models_summary,
            'users_summary': users_summary,
            'hourly_activity': hourly_activity,
        })
    
    @action(detail=False, methods=['get'])
    def my_activity(self, request):
        """Get current user's audit trail."""
        queryset = self.get_queryset().filter(user=request.user)
        
        # Paginate results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)