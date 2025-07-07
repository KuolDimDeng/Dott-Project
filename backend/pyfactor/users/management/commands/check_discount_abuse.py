"""
Management command to check for potential discount abuse
Run daily via cron job to flag suspicious accounts
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import logging

from users.discount_models import DiscountVerification
from users.discount_service import DiscountMonitoringService
from notifications.models import Notification, NotificationRecipient


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Check for potential discount abuse and flag suspicious accounts'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making any changes'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Grace period days (default: 30)'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        grace_days = options['days']
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Checking for discount abuse (dry_run={dry_run}, grace_days={grace_days})"
            )
        )
        
        # Check for expired grace periods
        self.check_expired_grace_periods(dry_run)
        
        # Check for suspicious patterns
        self.check_suspicious_patterns(dry_run)
        
        # Generate admin report
        self.generate_admin_report(dry_run)
    
    def check_expired_grace_periods(self, dry_run):
        """Flag accounts past their grace period"""
        expired_verifications = DiscountVerification.objects.filter(
            verification_status='pending',
            grace_period_ends__lte=timezone.now()
        )
        
        expired_count = expired_verifications.count()
        self.stdout.write(
            f"Found {expired_count} verifications past grace period"
        )
        
        if not dry_run and expired_count > 0:
            for verification in expired_verifications:
                verification.verification_status = 'flagged'
                verification.save()
                
                # Create admin notification
                self.create_admin_notification(
                    f"Discount verification expired",
                    f"Business {verification.business.name} has not completed "
                    f"verification after 30 days. Country: {verification.claimed_country}",
                    verification.business.id
                )
                
                logger.info(
                    f"Flagged business {verification.business.name} - "
                    f"grace period expired"
                )
    
    def check_suspicious_patterns(self, dry_run):
        """Check for suspicious usage patterns"""
        # Check for high risk scores
        high_risk = DiscountVerification.objects.filter(
            verification_status='pending',
            risk_score__gte=70
        )
        
        high_risk_count = high_risk.count()
        self.stdout.write(
            f"Found {high_risk_count} high-risk verifications"
        )
        
        if not dry_run and high_risk_count > 0:
            for verification in high_risk:
                verification.verification_status = 'flagged'
                verification.save()
                
                # Create admin notification
                self.create_admin_notification(
                    f"High risk discount application",
                    f"Business {verification.business.name} has risk score "
                    f"{verification.risk_score}. Claimed: {verification.claimed_country}, "
                    f"Detected: {verification.detected_country}",
                    verification.business.id
                )
        
        # Check for multiple login countries
        multi_country = DiscountVerification.objects.filter(
            verification_status='pending'
        )
        
        multi_country_flagged = 0
        for verification in multi_country:
            if len(verification.login_countries) > 3:
                if not dry_run:
                    verification.verification_status = 'flagged'
                    verification.save()
                    
                    self.create_admin_notification(
                        f"Multiple login countries detected",
                        f"Business {verification.business.name} has logged in from "
                        f"{len(verification.login_countries)} different countries",
                        verification.business.id
                    )
                
                multi_country_flagged += 1
        
        self.stdout.write(
            f"Flagged {multi_country_flagged} accounts with multiple login countries"
        )
    
    def generate_admin_report(self, dry_run):
        """Generate report for admin review"""
        report = DiscountMonitoringService.generate_abuse_report()
        
        if report:
            self.stdout.write(
                self.style.WARNING(
                    f"\nFlagged Accounts Report ({len(report)} accounts):"
                )
            )
            
            for item in report[:10]:  # Show first 10
                self.stdout.write(
                    f"- {item['business_name']}: "
                    f"Risk={item['risk_score']}, "
                    f"Claimed={item['claimed_country']}, "
                    f"Detected={item['detected_country']}"
                )
            
            if len(report) > 10:
                self.stdout.write(f"... and {len(report) - 10} more")
            
            # Create summary notification for admins
            if not dry_run and report:
                self.create_admin_notification(
                    f"Discount Abuse Report - {len(report)} accounts flagged",
                    f"Daily discount verification report: {len(report)} accounts "
                    f"have been flagged for manual review.",
                    priority='medium'
                )
    
    def create_admin_notification(self, title, message, business_id=None, priority='high'):
        """Create notification for admin users"""
        try:
            # Create the notification
            notification = Notification.objects.create(
                title=title,
                message=message,
                category='system',
                priority=priority,
                metadata={
                    'type': 'discount_verification',
                    'business_id': str(business_id) if business_id else None,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            # Send to all admin users
            from custom_auth.models import User
            admin_users = User.objects.filter(
                is_staff=True,
                is_active=True
            )
            
            for admin in admin_users:
                if hasattr(admin, 'tenant_id') and admin.tenant_id:
                    NotificationRecipient.objects.create(
                        notification=notification,
                        tenant_id=admin.tenant_id,
                        user=admin
                    )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created admin notification: {title}"
                )
            )
            
        except Exception as e:
            logger.error(f"Error creating admin notification: {e}")
            self.stdout.write(
                self.style.ERROR(
                    f"Failed to create notification: {e}"
                )
            )