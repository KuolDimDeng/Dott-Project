# Generated manually 2025-09-13
from django.db import migrations

def fix_consumer_profile_json_fields(apps, schema_editor):
    """Fix invalid JSON fields in ConsumerProfile"""
    ConsumerProfile = apps.get_model('marketplace', 'ConsumerProfile')

    for profile in ConsumerProfile.objects.all():
        # Fix delivery_addresses field
        if profile.delivery_addresses == '' or profile.delivery_addresses is None:
            profile.delivery_addresses = []
        elif not isinstance(profile.delivery_addresses, list):
            profile.delivery_addresses = []

        # Fix notification_preferences field
        if profile.notification_preferences == '' or profile.notification_preferences is None:
            profile.notification_preferences = {}
        elif not isinstance(profile.notification_preferences, dict):
            profile.notification_preferences = {}

        profile.save()

def reverse_fix(apps, schema_editor):
    """Reverse operation - do nothing"""
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0002_auto_20250830_0000'),  # Replace with your latest migration
    ]

    operations = [
        migrations.RunPython(fix_consumer_profile_json_fields, reverse_fix),
    ]