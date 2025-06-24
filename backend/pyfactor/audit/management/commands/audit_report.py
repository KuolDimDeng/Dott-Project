from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta, datetime
from audit.models import AuditLog
import csv
import json


class Command(BaseCommand):
    help = 'Generate audit reports'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--format',
            type=str,
            choices=['summary', 'csv', 'json'],
            default='summary',
            help='Output format',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to include in report',
        )
        parser.add_argument(
            '--user',
            type=str,
            help='Filter by username',
        )
        parser.add_argument(
            '--model',
            type=str,
            help='Filter by model name',
        )
        parser.add_argument(
            '--action',
            type=str,
            help='Filter by action type',
        )
        parser.add_argument(
            '--output',
            type=str,
            help='Output file (for csv/json formats)',
        )
    
    def handle(self, *args, **options):
        # Calculate date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=options['days'])
        
        # Build query
        query = Q(timestamp__gte=start_date) & Q(timestamp__lte=end_date)
        
        if options['user']:
            query &= Q(user__username__icontains=options['user'])
        
        if options['model']:
            query &= Q(model_name=options['model'])
        
        if options['action']:
            query &= Q(action=options['action'])
        
        # Get logs
        logs = AuditLog.objects.filter(query).order_by('-timestamp')
        
        # Generate report based on format
        if options['format'] == 'summary':
            self.generate_summary_report(logs, start_date, end_date)
        elif options['format'] == 'csv':
            self.generate_csv_report(logs, options['output'])
        elif options['format'] == 'json':
            self.generate_json_report(logs, options['output'])
    
    def generate_summary_report(self, logs, start_date, end_date):
        """Generate a summary report to stdout."""
        total_count = logs.count()
        
        self.stdout.write(self.style.SUCCESS(
            f"\nAudit Report Summary"
        ))
        self.stdout.write(
            f"Period: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
        )
        self.stdout.write(f"Total events: {total_count}\n")
        
        if total_count == 0:
            self.stdout.write("No audit events found for the specified period.")
            return
        
        # Actions summary
        actions_summary = logs.values('action').annotate(
            count=Count('id')
        ).order_by('-count')
        
        self.stdout.write(self.style.SUCCESS("Actions Summary:"))
        for item in actions_summary:
            self.stdout.write(f"  {item['action']}: {item['count']}")
        
        # Models summary
        models_summary = logs.values('model_name').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        self.stdout.write(self.style.SUCCESS("\nTop 10 Models:"))
        for item in models_summary:
            self.stdout.write(f"  {item['model_name']}: {item['count']}")
        
        # Users summary
        users_summary = logs.exclude(user__isnull=True).values(
            'user__username'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        self.stdout.write(self.style.SUCCESS("\nTop 10 Users:"))
        for item in users_summary:
            self.stdout.write(f"  {item['user__username']}: {item['count']}")
        
        # Failed attempts
        failed_count = logs.filter(is_successful=False).count()
        if failed_count > 0:
            self.stdout.write(self.style.WARNING(
                f"\nFailed operations: {failed_count}"
            ))
            
            # Show recent failures
            recent_failures = logs.filter(is_successful=False)[:5]
            for log in recent_failures:
                self.stdout.write(
                    f"  - {log.timestamp}: {log.action} {log.model_name} "
                    f"({log.error_message or 'No error message'})"
                )
    
    def generate_csv_report(self, logs, output_file):
        """Generate a CSV report."""
        if not output_file:
            output_file = f"audit_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        with open(output_file, 'w', newline='') as csvfile:
            fieldnames = [
                'timestamp', 'user', 'action', 'model_name',
                'object_id', 'object_repr', 'ip_address',
                'is_successful', 'error_message'
            ]
            
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for log in logs:
                writer.writerow({
                    'timestamp': log.timestamp.isoformat(),
                    'user': log.user.username if log.user else 'Anonymous',
                    'action': log.action,
                    'model_name': log.model_name,
                    'object_id': log.object_id,
                    'object_repr': log.object_repr,
                    'ip_address': log.ip_address,
                    'is_successful': log.is_successful,
                    'error_message': log.error_message,
                })
        
        self.stdout.write(self.style.SUCCESS(
            f"CSV report generated: {output_file}"
        ))
    
    def generate_json_report(self, logs, output_file):
        """Generate a JSON report."""
        if not output_file:
            output_file = f"audit_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        report_data = []
        
        for log in logs:
            report_data.append({
                'id': str(log.id),
                'timestamp': log.timestamp.isoformat(),
                'user': {
                    'id': str(log.user.id) if log.user else None,
                    'username': log.user.username if log.user else None,
                },
                'tenant_id': str(log.tenant_id) if log.tenant_id else None,
                'action': log.action,
                'model_name': log.model_name,
                'object_id': log.object_id,
                'object_repr': log.object_repr,
                'changes': log.changes,
                'ip_address': log.ip_address,
                'user_agent': log.user_agent,
                'is_successful': log.is_successful,
                'error_message': log.error_message,
                'extra_data': log.extra_data,
            })
        
        with open(output_file, 'w') as jsonfile:
            json.dump(report_data, jsonfile, indent=2)
        
        self.stdout.write(self.style.SUCCESS(
            f"JSON report generated: {output_file}"
        ))