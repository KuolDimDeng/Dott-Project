# Generated manually to change BonusPayment.approved_by from UUIDField to User ForeignKey
# This version handles UUID to integer conversion

from django.db import migrations, models
import django.db.models.deletion


def clear_approved_by_values(apps, schema_editor):
    """Clear all approved_by values before changing field type"""
    BonusPayment = apps.get_model('payroll', 'BonusPayment')
    BonusPayment.objects.all().update(approved_by=None)


def reverse_clear_approved_by(apps, schema_editor):
    """Reverse operation - nothing to do"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0001_initial'),
        ('payroll', '0008_add_payment_provider_fields'),
    ]

    operations = [
        # First, clear all existing values since we can't convert UUID to integer
        migrations.RunPython(clear_approved_by_values, reverse_clear_approved_by),
        
        # Then alter the field
        migrations.AlterField(
            model_name='bonuspayment',
            name='approved_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='approved_bonuses',
                to='custom_auth.User'
            ),
        ),
    ]