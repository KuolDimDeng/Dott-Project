#!/usr/bin/env python
"""
Django management command to add a periodic task to the Celery beat schedule to monitor tenant schemas.

This command:
1. Creates a periodic task in the Celery beat schedule
2. Sets the task to run at a specified interval
3. Configures the task to run the monitor_tenant_schemas_task with the --fix flag

Usage:
    python manage.py add_tenant_monitor_task [--interval INTERVAL] [--disable]

Options:
    --interval INTERVAL  Interval in minutes (default: 60)
    --disable           Disable the task instead of enabling it
"""

import os
import sys
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from django_celery_beat.models import PeriodicTask, IntervalSchedule

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Add a periodic task to monitor tenant schemas'
    
    def add_arguments(self, parser):
        parser.add_argument('--interval', type=int, default=60, help='Interval in minutes (default: 60)')
        parser.add_argument('--disable', action='store_true', help='Disable the task instead of enabling it')
    
    def handle(self, *args, **options):
        interval_minutes = options['interval']
        disable = options['disable']
        
        self.stdout.write(f"{'Disabling' if disable else 'Adding'} periodic task to monitor tenant schemas")
        
        # Get or create interval schedule
        interval, created = IntervalSchedule.objects.get_or_create(
            every=interval_minutes,
            period=IntervalSchedule.MINUTES,
        )
        
        if created:
            self.stdout.write(f"Created interval schedule: {interval_minutes} minutes")
        else:
            self.stdout.write(f"Using existing interval schedule: {interval_minutes} minutes")
        
        # Get or create periodic task
        task_name = 'Monitor Tenant Schemas'
        task, created = PeriodicTask.objects.get_or_create(
            name=task_name,
            defaults={
                'task': 'custom_auth.tasks.monitor_tenant_schemas_task',
                'interval': interval,
                'args': '[]',
                'kwargs': '{"fix": true}',
                'enabled': not disable,
            }
        )
        
        if not created:
            # Update existing task
            task.interval = interval
            task.enabled = not disable
            task.save()
            self.stdout.write(f"Updated existing periodic task: {task_name}")
        else:
            self.stdout.write(f"Created new periodic task: {task_name}")
        
        self.stdout.write(f"Periodic task is now {'disabled' if disable else 'enabled'}")