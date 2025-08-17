# Generated migration for module-specific bank account defaults

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('banking', '0009_wise_default_pos_account'),
    ]

    operations = [
        migrations.AddField(
            model_name='wiseitem',
            name='is_default_for_invoices',
            field=models.BooleanField(default=False, help_text='Use this account for invoice payments'),
        ),
        migrations.AddField(
            model_name='wiseitem',
            name='is_default_for_payroll',
            field=models.BooleanField(default=False, help_text='Use this account for payroll disbursements'),
        ),
        migrations.AddField(
            model_name='wiseitem',
            name='is_default_for_expenses',
            field=models.BooleanField(default=False, help_text='Use this account for expense reimbursements'),
        ),
        migrations.AddField(
            model_name='wiseitem',
            name='is_default_for_vendors',
            field=models.BooleanField(default=False, help_text='Use this account for vendor payments'),
        ),
    ]