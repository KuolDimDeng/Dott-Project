# Generated manually to add missing banking and mobile money fields to Employee model

from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0019_change_timeoffrequest_approved_by_to_user'),
    ]

    operations = [
        # Banking fields
        migrations.AddField(
            model_name='employee',
            name='bank_account_name',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='employee',
            name='bank_name',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='employee',
            name='account_number_last4',
            field=models.CharField(blank=True, max_length=4, null=True),
        ),
        migrations.AddField(
            model_name='employee',
            name='routing_number_last4',
            field=models.CharField(blank=True, max_length=4, null=True),
        ),
        migrations.AddField(
            model_name='employee',
            name='stripe_bank_account_id',
            field=models.CharField(blank=True, help_text='Stripe bank account ID for secure storage', max_length=255, null=True),
        ),
        # Mobile money fields
        migrations.AddField(
            model_name='employee',
            name='mobile_money_provider',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='employee',
            name='mobile_money_number',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='employee',
            name='prefer_mobile_money',
            field=models.BooleanField(default=False),
        ),
    ]