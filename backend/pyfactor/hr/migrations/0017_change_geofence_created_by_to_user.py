# Generated manually to change Geofence.created_by from Employee to User
# This version handles UUID to integer conversion

from django.db import migrations, models
import django.db.models.deletion


def clear_created_by_values(apps, schema_editor):
    """Clear all created_by values before changing field type"""
    Geofence = apps.get_model('hr', 'Geofence')
    Geofence.objects.all().update(created_by_id=None)


def reverse_clear_created_by(apps, schema_editor):
    """Reverse operation - nothing to do"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0001_initial'),
        ('hr', '0016_merge'),
    ]

    operations = [
        # First, clear all existing values since we can't convert UUID to integer
        migrations.RunPython(clear_created_by_values, reverse_clear_created_by),
        
        # Then alter the field
        migrations.AlterField(
            model_name='geofence',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_geofences',
                to='custom_auth.User'
            ),
        ),
    ]