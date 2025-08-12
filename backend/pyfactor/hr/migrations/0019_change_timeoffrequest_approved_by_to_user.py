# Generated manually to change TimeOffRequest.approved_by from Employee to User
# This version handles UUID to integer conversion

from django.db import migrations, models
import django.db.models.deletion


def clear_approved_by_values(apps, schema_editor):
    """Clear all approved_by values before changing field type"""
    TimeOffRequest = apps.get_model('hr', 'TimeOffRequest')
    TimeOffRequest.objects.all().update(approved_by_id=None)


def reverse_clear_approved_by(apps, schema_editor):
    """Reverse operation - nothing to do"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0001_initial'),
        ('hr', '0018_change_timesheet_approved_by_to_user'),
    ]

    operations = [
        # First, clear all existing values since we can't convert UUID to integer
        migrations.RunPython(clear_approved_by_values, reverse_clear_approved_by),
        
        # Then alter the field
        migrations.AlterField(
            model_name='timeoffrequest',
            name='approved_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='approved_time_off',
                to='custom_auth.User'
            ),
        ),
    ]