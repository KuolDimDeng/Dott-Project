# Generated manually to fix migration history
from django.db import migrations


def fix_migration_name(apps, schema_editor):
    """Update migration history to reflect renamed migration"""
    from django.db import connection
    with connection.cursor() as cursor:
        # Check if 0018_passwordresettoken exists and 0019 doesn't
        cursor.execute(
            "SELECT COUNT(*) FROM django_migrations WHERE app='custom_auth' AND name='0018_passwordresettoken'"
        )
        has_old = cursor.fetchone()[0] > 0
        
        cursor.execute(
            "SELECT COUNT(*) FROM django_migrations WHERE app='custom_auth' AND name='0019_passwordresettoken'"
        )
        has_new = cursor.fetchone()[0] > 0
        
        if has_old and not has_new:
            # Update the migration name in history
            cursor.execute(
                "UPDATE django_migrations SET name='0019_passwordresettoken' WHERE app='custom_auth' AND name='0018_passwordresettoken'"
            )


def reverse_fix_migration_name(apps, schema_editor):
    """Reverse the migration name fix"""
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE django_migrations SET name='0018_passwordresettoken' WHERE app='custom_auth' AND name='0019_passwordresettoken'"
        )


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0019_passwordresettoken'),
    ]

    operations = [
        migrations.RunPython(fix_migration_name, reverse_fix_migration_name),
    ]