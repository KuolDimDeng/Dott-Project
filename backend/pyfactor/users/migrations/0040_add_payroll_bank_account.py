# Generated migration for adding payroll_bank_account_id to Business model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0039_add_multi_currency_fields'),  # Update this to the latest migration
    ]

    operations = [
        migrations.AddField(
            model_name='business',
            name='payroll_bank_account_id',
            field=models.UUIDField(blank=True, help_text='Bank account designated for payroll processing', null=True),
        ),
    ]