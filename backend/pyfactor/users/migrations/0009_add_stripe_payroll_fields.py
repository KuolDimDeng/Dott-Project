# Generated manually for adding Stripe payroll fields to Business model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0008_add_stripe_connect_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='business',
            name='stripe_customer_id',
            field=models.CharField(blank=True, help_text='Stripe Customer ID for ACH debits', max_length=100),
        ),
        migrations.AddField(
            model_name='business',
            name='default_bank_token',
            field=models.CharField(blank=True, help_text='Payment method ID for ACH debits', max_length=100),
        ),
        migrations.AddField(
            model_name='business',
            name='ach_mandate_id',
            field=models.CharField(blank=True, help_text='ACH mandate for recurring debits', max_length=100),
        ),
    ]