# Filing Confirmation Serializers

from rest_framework import serializers
from .models import (
    FilingConfirmation, FilingNotification, TaxFiling
)
from .serializers import TaxFilingListSerializer, TaxFilingSerializer


class FilingConfirmationSerializer(serializers.ModelSerializer):
    """Serializer for tax filing confirmations."""
    filing = TaxFilingListSerializer(read_only=True)
    notification_count = serializers.SerializerMethodField()
    pdf_receipt_available = serializers.SerializerMethodField()
    
    class Meta:
        model = FilingConfirmation
        fields = [
            'id',
            'filing',
            'confirmation_number',
            'generated_at',
            'pdf_receipt_available',
            'state_confirmation_number',
            'state_confirmation_data',
            'metadata',
            'notification_count'
        ]
        read_only_fields = ['id', 'confirmation_number', 'generated_at']
    
    def get_notification_count(self, obj):
        """Get count of notifications sent for this confirmation."""
        return obj.notifications.count()
    
    def get_pdf_receipt_available(self, obj):
        """Check if PDF receipt is available."""
        return bool(obj.pdf_receipt or obj.pdf_file_path)


class FilingNotificationSerializer(serializers.ModelSerializer):
    """Serializer for filing notifications."""
    confirmation_number = serializers.CharField(
        source='confirmation.confirmation_number', 
        read_only=True
    )
    filing_id = serializers.CharField(
        source='confirmation.filing.filing_id', 
        read_only=True
    )
    notification_type_display = serializers.CharField(
        source='get_notification_type_display', 
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display', 
        read_only=True
    )
    
    class Meta:
        model = FilingNotification
        fields = [
            'id',
            'confirmation',
            'confirmation_number',
            'filing_id',
            'notification_type',
            'notification_type_display',
            'recipient',
            'subject',
            'content',
            'status',
            'status_display',
            'sent_at',
            'delivered_at',
            'read_at',
            'error_message',
            'retry_count',
            'external_id',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id', 'sent_at', 'delivered_at', 'read_at', 
            'created_at', 'updated_at'
        ]


class FilingConfirmationDetailSerializer(FilingConfirmationSerializer):
    """Detailed serializer for tax filing confirmations with full filing data."""
    filing = TaxFilingSerializer(read_only=True)
    notifications = FilingNotificationSerializer(many=True, read_only=True)
    
    class Meta(FilingConfirmationSerializer.Meta):
        fields = FilingConfirmationSerializer.Meta.fields + ['notifications']