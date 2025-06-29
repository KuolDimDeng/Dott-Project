# taxes/services/abuse_control_service.py
from django.db import models
from django.utils import timezone
from datetime import timedelta
from django.core.cache import cache
import logging
from typing import Tuple, Optional, Dict
from taxes.models import (
    TaxDataEntryControl, TaxDataEntryLog, TaxDataAbuseReport, TaxDataBlacklist
)

logger = logging.getLogger(__name__)


class TaxDataAbuseControlService:
    """Service to handle tax data entry abuse control and rate limiting"""
    
    @staticmethod
    def check_rate_limit(tenant_id: str, control_type: str, user, ip_address: str, 
                        entry_count: int = 1) -> Tuple[bool, Optional[str]]:
        """
        Check if the tax data entry is within rate limits
        Returns: (allowed, error_message)
        """
        # Check blacklist first
        if TaxDataAbuseControlService._is_blacklisted(tenant_id, user, ip_address):
            return False, "Access denied due to blacklist"
        
        # Get or create control settings
        control, created = TaxDataEntryControl.objects.get_or_create(
            tenant_id=tenant_id,
            control_type=control_type,
            defaults={
                'max_entries_per_hour': 100,
                'max_entries_per_day': 1000,
                'max_entries_per_month': 10000,
                'is_active': True
            }
        )
        
        if not control.is_active:
            return True, None  # Controls disabled, allow all
        
        # Check rate limits
        now = timezone.now()
        
        # Hourly limit
        hour_ago = now - timedelta(hours=1)
        hourly_count = TaxDataEntryLog.objects.filter(
            tenant_id=tenant_id,
            control_type=control_type,
            created_at__gte=hour_ago,
            status='allowed'
        ).aggregate(total=models.Sum('entry_count'))['total'] or 0
        
        if hourly_count + entry_count > control.max_entries_per_hour:
            TaxDataAbuseControlService._log_rate_limit_hit(
                tenant_id, control_type, user, ip_address, 'hourly', entry_count
            )
            return False, f"Hourly rate limit exceeded ({control.max_entries_per_hour} entries/hour)"
        
        # Daily limit
        day_ago = now - timedelta(days=1)
        daily_count = TaxDataEntryLog.objects.filter(
            tenant_id=tenant_id,
            control_type=control_type,
            created_at__gte=day_ago,
            status='allowed'
        ).aggregate(total=models.Sum('entry_count'))['total'] or 0
        
        if daily_count + entry_count > control.max_entries_per_day:
            TaxDataAbuseControlService._log_rate_limit_hit(
                tenant_id, control_type, user, ip_address, 'daily', entry_count
            )
            return False, f"Daily rate limit exceeded ({control.max_entries_per_day} entries/day)"
        
        # Monthly limit
        month_ago = now - timedelta(days=30)
        monthly_count = TaxDataEntryLog.objects.filter(
            tenant_id=tenant_id,
            control_type=control_type,
            created_at__gte=month_ago,
            status='allowed'
        ).aggregate(total=models.Sum('entry_count'))['total'] or 0
        
        if monthly_count + entry_count > control.max_entries_per_month:
            TaxDataAbuseControlService._log_rate_limit_hit(
                tenant_id, control_type, user, ip_address, 'monthly', entry_count
            )
            return False, f"Monthly rate limit exceeded ({control.max_entries_per_month} entries/month)"
        
        return True, None
    
    @staticmethod
    def log_entry(tenant_id: str, control_type: str, entry_type: str, user, 
                  ip_address: str, user_agent: str, status: str, 
                  entry_count: int = 1, details: Dict = None):
        """Log a tax data entry attempt"""
        TaxDataEntryLog.objects.create(
            tenant_id=tenant_id,
            control_type=control_type,
            entry_type=entry_type,
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
            entry_count=entry_count,
            details=details
        )
    
    @staticmethod
    def check_suspicious_activity(tenant_id: str, user, ip_address: str) -> bool:
        """Check for suspicious activity patterns"""
        # Check for rapid fire requests
        cache_key = f"tax_abuse_rapid_{tenant_id}_{user.id}_{ip_address}"
        request_count = cache.get(cache_key, 0)
        
        if request_count > 10:  # More than 10 requests in a minute
            TaxDataAbuseControlService._create_abuse_report(
                tenant_id, user, ip_address,
                "Rapid fire requests detected",
                "high",
                {"request_count": request_count}
            )
            return True
        
        cache.set(cache_key, request_count + 1, 60)  # 1 minute expiry
        
        # Check for unusual patterns
        hour_ago = timezone.now() - timedelta(hours=1)
        recent_logs = TaxDataEntryLog.objects.filter(
            tenant_id=tenant_id,
            user=user,
            created_at__gte=hour_ago
        )
        
        # Different IPs in short time
        unique_ips = recent_logs.values_list('ip_address', flat=True).distinct()
        if len(unique_ips) > 5:
            TaxDataAbuseControlService._create_abuse_report(
                tenant_id, user, ip_address,
                "Multiple IP addresses detected",
                "medium",
                {"ip_count": len(unique_ips), "ips": list(unique_ips)}
            )
            return True
        
        # Too many failed attempts
        failed_count = recent_logs.filter(
            status__in=['rate_limited', 'blocked', 'suspicious']
        ).count()
        if failed_count > 20:
            TaxDataAbuseControlService._create_abuse_report(
                tenant_id, user, ip_address,
                "Excessive failed attempts",
                "high",
                {"failed_count": failed_count}
            )
            return True
        
        return False
    
    @staticmethod
    def _is_blacklisted(tenant_id: str, user, ip_address: str) -> bool:
        """Check if user, tenant, or IP is blacklisted"""
        now = timezone.now()
        
        # Check user blacklist
        if user and TaxDataBlacklist.objects.filter(
            blacklist_type='user',
            identifier=str(user.id),
            is_active=True
        ).filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now)
        ).exists():
            return True
        
        # Check tenant blacklist
        if TaxDataBlacklist.objects.filter(
            blacklist_type='tenant',
            identifier=str(tenant_id),
            is_active=True
        ).filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now)
        ).exists():
            return True
        
        # Check IP blacklist
        if TaxDataBlacklist.objects.filter(
            blacklist_type='ip',
            identifier=ip_address,
            is_active=True
        ).filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now)
        ).exists():
            return True
        
        return False
    
    @staticmethod
    def _log_rate_limit_hit(tenant_id: str, control_type: str, user, 
                           ip_address: str, limit_type: str, entry_count: int):
        """Log when rate limit is hit"""
        logger.warning(f"Rate limit hit for tenant {tenant_id}: {limit_type} limit on {control_type}")
        
        # Create abuse report for repeated offenders
        hour_ago = timezone.now() - timedelta(hours=1)
        recent_limit_hits = TaxDataEntryLog.objects.filter(
            tenant_id=tenant_id,
            user=user,
            status='rate_limited',
            created_at__gte=hour_ago
        ).count()
        
        if recent_limit_hits > 5:
            TaxDataAbuseControlService._create_abuse_report(
                tenant_id, user, ip_address,
                f"Repeated {limit_type} rate limit violations",
                "medium",
                {"limit_type": limit_type, "hit_count": recent_limit_hits}
            )
    
    @staticmethod
    def _create_abuse_report(tenant_id: str, user, ip_address: str, 
                           report_type: str, severity: str, evidence: Dict):
        """Create an abuse report"""
        TaxDataAbuseReport.objects.create(
            tenant_id=tenant_id,
            report_type=report_type,
            severity=severity,
            user=user,
            description=f"Automated report: {report_type}",
            evidence=evidence
        )
        
        logger.warning(f"Abuse report created: {report_type} for user {user.email}")
    
    @staticmethod
    def add_to_blacklist(blacklist_type: str, identifier: str, reason: str, 
                        created_by, expires_in_days: Optional[int] = None) -> TaxDataBlacklist:
        """Add an entry to the blacklist"""
        expires_at = None
        if expires_in_days:
            expires_at = timezone.now() + timedelta(days=expires_in_days)
        
        blacklist_entry, created = TaxDataBlacklist.objects.update_or_create(
            blacklist_type=blacklist_type,
            identifier=identifier,
            defaults={
                'reason': reason,
                'is_active': True,
                'expires_at': expires_at,
                'created_by': created_by
            }
        )
        
        logger.info(f"Added to blacklist: {blacklist_type} - {identifier}")
        return blacklist_entry
    
    @staticmethod
    def remove_from_blacklist(blacklist_type: str, identifier: str):
        """Remove an entry from the blacklist"""
        TaxDataBlacklist.objects.filter(
            blacklist_type=blacklist_type,
            identifier=identifier
        ).update(is_active=False)
        
        logger.info(f"Removed from blacklist: {blacklist_type} - {identifier}")