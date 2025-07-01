"""
Tax Filing Confirmation API Views

This module provides API endpoints for managing tax filing confirmations,
including generating confirmations, sending notifications, and viewing receipts.
"""

import logging
from typing import Dict, Any

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models import (
    TaxFiling, FilingConfirmation, FilingNotification,
    NotificationType, NotificationStatus
)
from ..confirmations.confirmation_generator import ConfirmationGenerator
from ..serializers_confirmations import (
    FilingConfirmationSerializer, FilingNotificationSerializer,
    FilingConfirmationDetailSerializer
)

logger = logging.getLogger(__name__)


class FilingConfirmationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tax filing confirmations."""
    
    serializer_class = FilingConfirmationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get confirmations for the current tenant."""
        return FilingConfirmation.objects.filter(
            tenant_id=self.request.user.tenant_id
        ).select_related('filing').prefetch_related('notifications')
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate confirmation for a tax filing."""
        filing_id = request.data.get('filing_id')
        
        if not filing_id:
            return Response(
                {'error': 'filing_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            filing = TaxFiling.objects.get(
                id=filing_id,
                tenant_id=request.user.tenant_id
            )
            
            # Check if filing is in a valid state for confirmation
            valid_statuses = ['submitted', 'accepted', 'completed']
            if filing.status not in valid_statuses:
                return Response(
                    {'error': f'Filing must be in one of these statuses: {", ".join(valid_statuses)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate confirmation
            generator = ConfirmationGenerator()
            confirmation = generator.generate_confirmation(filing)
            
            serializer = FilingConfirmationSerializer(confirmation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except TaxFiling.DoesNotExist:
            return Response(
                {'error': 'Filing not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error generating confirmation: {str(e)}")
            return Response(
                {'error': 'Failed to generate confirmation'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def download_receipt(self, request, pk=None):
        """Download PDF receipt for a confirmation."""
        confirmation = self.get_object()
        
        if not confirmation.pdf_receipt:
            return Response(
                {'error': 'PDF receipt not available'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create response with PDF
        response = HttpResponse(
            confirmation.pdf_receipt,
            content_type='application/pdf'
        )
        response['Content-Disposition'] = f'attachment; filename="tax_filing_receipt_{confirmation.confirmation_number}.pdf"'
        
        return response
    
    @action(detail=True, methods=['post'])
    def resend_notification(self, request, pk=None):
        """Resend confirmation notification."""
        confirmation = self.get_object()
        notification_type = request.data.get('notification_type', 'email')
        
        if notification_type not in ['email', 'sms']:
            return Response(
                {'error': 'Invalid notification_type. Must be "email" or "sms"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            generator = ConfirmationGenerator()
            notification = generator.resend_confirmation(confirmation, notification_type)
            
            serializer = FilingNotificationSerializer(notification)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error resending notification: {str(e)}")
            return Response(
                {'error': 'Failed to resend notification'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def notifications(self, request, pk=None):
        """Get all notifications for a confirmation."""
        confirmation = self.get_object()
        notifications = confirmation.notifications.all().order_by('-created')
        
        serializer = FilingNotificationSerializer(notifications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_filing(self, request):
        """Get confirmation by filing ID."""
        filing_id = request.query_params.get('filing_id')
        
        if not filing_id:
            return Response(
                {'error': 'filing_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            confirmation = FilingConfirmation.objects.get(
                filing_id=filing_id,
                tenant_id=request.user.tenant_id
            )
            serializer = FilingConfirmationSerializer(confirmation)
            return Response(serializer.data)
            
        except FilingConfirmation.DoesNotExist:
            return Response(
                {'error': 'Confirmation not found for this filing'},
                status=status.HTTP_404_NOT_FOUND
            )


class FilingNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing filing notifications."""
    
    serializer_class = FilingNotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get notifications for the current tenant."""
        return FilingNotification.objects.filter(
            tenant_id=self.request.user.tenant_id
        ).select_related('confirmation__filing').order_by('-created')
    
    @action(detail=True, methods=['post'])
    def check_status(self, request, pk=None):
        """Check delivery status of a notification (for SMS)."""
        notification = self.get_object()
        
        if notification.notification_type != NotificationType.SMS:
            return Response(
                {'error': 'Status check only available for SMS notifications'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            generator = ConfirmationGenerator()
            updated_status = generator.check_notification_status(notification)
            
            notification.refresh_from_db()
            serializer = FilingNotificationSerializer(notification)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error checking notification status: {str(e)}")
            return Response(
                {'error': 'Failed to check notification status'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get notification summary statistics."""
        queryset = self.get_queryset()
        
        summary = {
            'total': queryset.count(),
            'by_type': {},
            'by_status': {},
            'recent_failures': []
        }
        
        # Count by type
        for notification_type in NotificationType:
            count = queryset.filter(notification_type=notification_type).count()
            summary['by_type'][notification_type.label] = count
        
        # Count by status
        for notification_status in NotificationStatus:
            count = queryset.filter(status=notification_status).count()
            summary['by_status'][notification_status.label] = count
        
        # Recent failures
        recent_failures = queryset.filter(
            status=NotificationStatus.FAILED,
            created_at__gte=timezone.now() - timezone.timedelta(days=7)
        )[:10]
        
        summary['recent_failures'] = FilingNotificationSerializer(
            recent_failures, many=True
        ).data
        
        return Response(summary)


@transaction.atomic
def auto_generate_confirmations():
    """
    Background task to automatically generate confirmations for completed filings.
    This can be called by a cron job or task scheduler.
    """
    generator = ConfirmationGenerator()
    
    # Find filings that need confirmations
    filings_to_confirm = TaxFiling.objects.filter(
        status__in=['submitted', 'accepted', 'completed'],
        confirmation__isnull=True  # No confirmation exists
    ).select_for_update()
    
    results = {
        'processed': 0,
        'succeeded': 0,
        'failed': 0,
        'errors': []
    }
    
    for filing in filings_to_confirm:
        results['processed'] += 1
        try:
            confirmation = generator.generate_confirmation(filing)
            results['succeeded'] += 1
            logger.info(f"Generated confirmation {confirmation.confirmation_number} for filing {filing.id}")
        except Exception as e:
            results['failed'] += 1
            error_msg = f"Failed to generate confirmation for filing {filing.id}: {str(e)}"
            results['errors'].append(error_msg)
            logger.error(error_msg)
    
    logger.info(f"Auto-confirmation results: {results}")
    return results