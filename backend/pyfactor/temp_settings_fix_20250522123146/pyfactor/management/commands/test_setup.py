"""
Django management command to test the setup.
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Test Django setup'

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Django setup is working correctly!')
        )
