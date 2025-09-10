"""
Management command to enforce data retention policies
Runs daily to delete expired data per compliance requirements
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from datetime import timedelta
import hashlib
import boto3
from django.conf import settings

from compliance.retention_policy import RETENTION_POLICIES, get_retention_period
from compliance.models import ComplianceLog, DataRetentionOverride
from chat.models import ChatMessage, ChatConversation, CallSession
from custom_auth.phone_otp_models import PhoneOTP
from session_manager.models import UserSession

User = get_user_model()

class Command(BaseCommand):
    help = 'Enforce data retention policies and delete expired data'
    
    def __init__(self):
        super().__init__()
        self.deleted_counts = {}
        self.s3_client = None
        if hasattr(settings, 'AWS_ACCESS_KEY_ID'):
            self.s3_client = boto3.client('s3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
            )
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force deletion even if override exists',
        )
    
    def handle(self, *args, **options):
        self.dry_run = options['dry_run']
        self.force = options['force']
        
        if self.dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No data will be deleted'))
        
        self.stdout.write('Starting retention policy enforcement...')
        
        # Process each data category
        self.process_messages()
        self.process_auth_data()
        self.process_call_records()
        self.process_financial_data()
        self.process_temporary_data()
        self.process_gdpr_requests()
        
        # Summary
        self.stdout.write(self.style.SUCCESS('\nRetention Policy Enforcement Complete'))
        for model, count in self.deleted_counts.items():
            self.stdout.write(f'  {model}: {count} records deleted')
    
    def process_messages(self):
        """Delete expired chat messages"""
        self.stdout.write('Processing chat messages...')
        
        # Get retention period
        retention = get_retention_period('messages', 'default')
        if not retention:
            return
        
        cutoff = timezone.now() - retention
        
        # Check for overrides
        overrides = DataRetentionOverride.objects.filter(
            data_type='messages',
            effective_until__gte=timezone.now()
        )
        
        # Find messages to delete
        messages = ChatMessage.objects.filter(
            created_at__lt=cutoff,
            is_deleted=False
        )
        
        # Exclude messages with retention overrides
        if not self.force and overrides.exists():
            for override in overrides:
                if override.user:
                    messages = messages.exclude(sender=override.user)
        
        # Delete associated media files first
        for message in messages.filter(voice_url__isnull=False):
            if not self.dry_run:
                self.delete_s3_file(message.voice_url)
        
        for message in messages.filter(image_url__isnull=False):
            if not self.dry_run:
                self.delete_s3_file(message.image_url)
        
        # Log deletions
        if not self.dry_run:
            with transaction.atomic():
                for message in messages[:1000]:  # Process in batches
                    ComplianceLog.objects.create(
                        action='AUTO_DELETE',
                        model_name='ChatMessage',
                        record_id=str(message.id),
                        user=message.sender,
                        reason='Retention policy expired',
                        data_hash=self.hash_data(message.text_content),
                        retention_period_days=retention.days
                    )
        
        # Delete messages
        count = messages.count()
        if not self.dry_run:
            messages.delete()
        
        self.deleted_counts['ChatMessage'] = count
        self.stdout.write(f'  Deleted {count} chat messages')
    
    def process_auth_data(self):
        """Delete expired authentication data"""
        self.stdout.write('Processing authentication data...')
        
        # Delete expired OTPs
        otp_retention = get_retention_period('auth', 'otp_codes')
        if otp_retention:
            cutoff = timezone.now() - otp_retention
            otps = PhoneOTP.objects.filter(created_at__lt=cutoff)
            count = otps.count()
            
            if not self.dry_run:
                otps.delete()
            
            self.deleted_counts['PhoneOTP'] = count
            self.stdout.write(f'  Deleted {count} expired OTPs')
        
        # Delete old sessions
        session_retention = get_retention_period('auth', 'sessions')
        if session_retention:
            cutoff = timezone.now() - session_retention
            sessions = UserSession.objects.filter(
                last_activity__lt=cutoff
            )
            count = sessions.count()
            
            if not self.dry_run:
                sessions.delete()
            
            self.deleted_counts['UserSession'] = count
            self.stdout.write(f'  Deleted {count} expired sessions')
    
    def process_call_records(self):
        """Process call recordings and metadata"""
        self.stdout.write('Processing call records...')
        
        # Delete recordings (keep metadata longer)
        recording_retention = get_retention_period('call_records', 'recordings')
        if recording_retention:
            cutoff = timezone.now() - recording_retention
            
            # Find calls with recordings to delete
            from chat.models import CallRecording
            recordings = CallRecording.objects.filter(
                created_at__lt=cutoff
            )
            
            for recording in recordings:
                if not self.dry_run:
                    # Delete from storage
                    self.delete_s3_file(recording.recording_url)
                    
                    # Log deletion
                    ComplianceLog.objects.create(
                        action='AUTO_DELETE',
                        model_name='CallRecording',
                        record_id=str(recording.id),
                        user=recording.call_session.caller,
                        reason='Recording retention expired',
                        data_hash=self.hash_data(recording.recording_url),
                        retention_period_days=recording_retention.days
                    )
            
            count = recordings.count()
            if not self.dry_run:
                recordings.delete()
            
            self.deleted_counts['CallRecording'] = count
            self.stdout.write(f'  Deleted {count} call recordings')
    
    def process_financial_data(self):
        """Process financial data (usually just anonymize, not delete)"""
        self.stdout.write('Processing financial data...')
        
        # Financial data is typically anonymized rather than deleted
        # due to accounting requirements
        pass
    
    def process_temporary_data(self):
        """Delete temporary and cached data"""
        self.stdout.write('Processing temporary data...')
        
        # This would handle temp file uploads, export files, etc.
        # Implementation depends on your specific temporary storage
        pass
    
    def process_gdpr_requests(self):
        """Process pending GDPR deletion requests"""
        self.stdout.write('Processing GDPR requests...')
        
        from compliance.models import GDPRRequest
        
        # Find requests past deadline
        overdue_requests = GDPRRequest.objects.filter(
            request_type='DELETE',
            status='pending',
            deadline_at__lt=timezone.now()
        )
        
        for request in overdue_requests:
            if not self.dry_run:
                self.process_user_deletion(request.user)
                request.status = 'completed'
                request.completed_at = timezone.now()
                request.save()
        
        count = overdue_requests.count()
        self.stdout.write(f'  Processed {count} GDPR deletion requests')
    
    def process_user_deletion(self, user):
        """Delete all user data per GDPR request"""
        with transaction.atomic():
            # Delete messages
            ChatMessage.objects.filter(sender=user).delete()
            
            # Delete conversations
            ChatConversation.objects.filter(
                models.Q(consumer=user) | models.Q(business=user)
            ).delete()
            
            # Delete call records
            CallSession.objects.filter(
                models.Q(caller=user) | models.Q(callee=user)
            ).delete()
            
            # Anonymize financial records instead of deleting
            from payments.models import Transaction
            Transaction.objects.filter(user=user).update(
                user=None,
                customer_name='DELETED',
                customer_email='deleted@deleted.com'
            )
            
            # Log the deletion
            ComplianceLog.objects.create(
                action='GDPR_REQUEST',
                model_name='User',
                record_id=str(user.id),
                user=None,  # Don't link to deleted user
                reason='GDPR deletion request completed',
                data_hash=self.hash_data(user.email)
            )
    
    def delete_s3_file(self, url):
        """Delete a file from S3"""
        if not url or not self.s3_client:
            return
        
        try:
            # Extract bucket and key from URL
            if 's3.amazonaws.com' in url:
                parts = url.split('.s3.amazonaws.com/')
                if len(parts) == 2:
                    bucket = parts[0].split('//')[-1]
                    key = parts[1]
                    self.s3_client.delete_object(Bucket=bucket, Key=key)
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Failed to delete S3 file: {e}'))
    
    def hash_data(self, data):
        """Create SHA256 hash of data for audit log"""
        if not data:
            return ''
        return hashlib.sha256(str(data).encode()).hexdigest()