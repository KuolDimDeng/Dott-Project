# NO-OP Migration - Tables already fixed in production
# This migration is intentionally empty to prevent deployment failures

from django.db import migrations

def do_nothing(apps, schema_editor):
    """This migration has already been applied directly to the database"""
    print("✅ Transport migration 0004 - Already applied, skipping...")
    pass

def reverse_do_nothing(apps, schema_editor):
    """Reverse is also a no-op"""
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('transport', '0003_add_transport_models'),
    ]

    operations = [
        migrations.RunPython(do_nothing, reverse_do_nothing),
    ]