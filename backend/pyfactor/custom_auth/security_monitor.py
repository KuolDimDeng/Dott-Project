"""
Security monitoring system to detect and alert on tenant isolation violations.
"""
import logging
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings
import json

logger = logging.getLogger('security.monitor')


class TenantSecurityMonitor:
    """
    Monitor for tenant isolation violations and security events.
    """
    
    CRITICAL_EVENTS = [
        'CROSS_TENANT_CREATE_ATTEMPT',
        'CROSS_TENANT_DELETE_ATTEMPT',
        'TENANT_ID_CHANGE_ATTEMPT',
        'NO_TENANT_CONTEXT',
        'MODEL_NO_TENANT_FIELD',
    ]
    
    WARNING_EVENTS = [
        'NO_TENANT_ID',
        'REQUEST_ERROR',
        'MIDDLEWARE_ERROR',
    ]
    
    def __init__(self):
        self.alerts_sent = {}
    
    def check_security_events(self, time_window_minutes=15):
        """
        Check for security events in the last time window.
        Returns list of events that need attention.
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    event_type,
                    severity,
                    COUNT(*) as count,
                    array_agg(DISTINCT user_email) as users,
                    array_agg(DISTINCT tenant_id::text) as tenants,
                    MIN(timestamp) as first_occurrence,
                    MAX(timestamp) as last_occurrence
                FROM security_audit_log
                WHERE timestamp > NOW() - INTERVAL '%s minutes'
                GROUP BY event_type, severity
                ORDER BY severity DESC, count DESC
            """, [time_window_minutes])
            
            events = []
            for row in cursor.fetchall():
                event = {
                    'event_type': row[0],
                    'severity': row[1],
                    'count': row[2],
                    'users': row[3],
                    'tenants': row[4],
                    'first_occurrence': row[5],
                    'last_occurrence': row[6],
                }
                events.append(event)
                
                # Check if this needs immediate alert
                if event['severity'] == 'CRITICAL':
                    self.send_alert(event, priority='HIGH')
                elif event['severity'] == 'ERROR' and event['count'] > 10:
                    self.send_alert(event, priority='MEDIUM')
            
            return events
    
    def check_cross_tenant_queries(self):
        """
        Analyze database logs for potential cross-tenant queries.
        This requires PostgreSQL logging to be enabled.
        """
        suspicious_patterns = []
        
        with connection.cursor() as cursor:
            # Check for queries without tenant_id filter
            cursor.execute("""
                SELECT 
                    tablename,
                    COUNT(*) as query_count
                FROM pg_stat_user_tables
                WHERE n_tup_fetched > 1000
                AND tablename IN (
                    'crm_customer', 'sales_invoice', 'inventory_product'
                )
                GROUP BY tablename
                HAVING COUNT(*) > 100
            """)
            
            for row in cursor.fetchall():
                if row[1] > 1000:  # High number of fetches might indicate missing filter
                    suspicious_patterns.append({
                        'table': row[0],
                        'fetches': row[1],
                        'issue': 'High fetch count - possible missing tenant filter'
                    })
        
        return suspicious_patterns
    
    def validate_all_models_have_tenant_field(self):
        """
        Check that all models (except exempt ones) have tenant_id field.
        """
        from django.apps import apps
        
        # Models that don't need tenant isolation
        EXEMPT_MODELS = [
            'User', 'Group', 'Permission', 'ContentType', 'Session',
            'Country', 'State', 'City', 'Currency', 'Timezone',
            'Migration', 'LogEntry',
        ]
        
        missing_tenant_field = []
        
        for model in apps.get_models():
            model_name = model.__name__
            
            # Skip exempt models
            if model_name in EXEMPT_MODELS:
                continue
            
            # Skip Django internal models
            if model._meta.app_label in ['admin', 'auth', 'contenttypes', 'sessions']:
                continue
            
            # Check for tenant_id field
            field_names = [f.name for f in model._meta.fields]
            if 'tenant_id' not in field_names and 'business_id' not in field_names:
                missing_tenant_field.append({
                    'app': model._meta.app_label,
                    'model': model_name,
                    'table': model._meta.db_table,
                })
        
        if missing_tenant_field:
            logger.warning(
                f"Models without tenant field: {json.dumps(missing_tenant_field, indent=2)}"
            )
        
        return missing_tenant_field
    
    def send_alert(self, event, priority='MEDIUM'):
        """
        Send alert for critical security events.
        Integrate with your alerting system (email, Slack, PagerDuty, etc.)
        """
        # Prevent alert spam
        alert_key = f"{event['event_type']}_{priority}"
        if alert_key in self.alerts_sent:
            last_sent = self.alerts_sent[alert_key]
            if datetime.now() - last_sent < timedelta(minutes=30):
                return  # Don't send duplicate alerts within 30 minutes
        
        # Format alert message
        message = f"""
        🚨 SECURITY ALERT - {priority} PRIORITY
        
        Event Type: {event['event_type']}
        Severity: {event['severity']}
        Occurrences: {event['count']}
        
        Affected Users: {', '.join(event.get('users', []))}
        Affected Tenants: {', '.join(event.get('tenants', []))}
        
        First Occurrence: {event.get('first_occurrence')}
        Last Occurrence: {event.get('last_occurrence')}
        
        Action Required: Immediate investigation needed.
        """
        
        # Log the alert
        logger.critical(f"SECURITY ALERT: {message}")
        
        # Send to monitoring system
        # TODO: Integrate with Sentry
        # TODO: Send to Slack
        # TODO: Send email to security team
        
        # Mark as sent
        self.alerts_sent[alert_key] = datetime.now()
    
    def generate_security_report(self):
        """
        Generate a comprehensive security report.
        """
        report = {
            'timestamp': datetime.now().isoformat(),
            'security_events': self.check_security_events(time_window_minutes=60),
            'suspicious_queries': self.check_cross_tenant_queries(),
            'missing_tenant_fields': self.validate_all_models_have_tenant_field(),
        }
        
        # Count critical issues
        critical_count = sum(
            1 for e in report['security_events'] 
            if e['severity'] == 'CRITICAL'
        )
        
        if critical_count > 0:
            report['status'] = 'CRITICAL'
            report['message'] = f'{critical_count} critical security events detected!'
        elif report['missing_tenant_fields']:
            report['status'] = 'WARNING'
            report['message'] = f"{len(report['missing_tenant_fields'])} models missing tenant isolation"
        else:
            report['status'] = 'OK'
            report['message'] = 'No critical security issues detected'
        
        return report


class Command(BaseCommand):
    """
    Django management command to run security monitoring.
    Run with: python manage.py monitor_tenant_security
    """
    help = 'Monitor tenant security and detect violations'
    
    def handle(self, *args, **options):
        monitor = TenantSecurityMonitor()
        report = monitor.generate_security_report()
        
        self.stdout.write(
            self.style.SUCCESS(f"Security Report Generated: {report['timestamp']}")
        )
        self.stdout.write(f"Status: {report['status']}")
        self.stdout.write(f"Message: {report['message']}")
        
        if report['status'] in ['CRITICAL', 'WARNING']:
            self.stdout.write(
                self.style.ERROR(json.dumps(report, indent=2))
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(json.dumps(report, indent=2))
            )