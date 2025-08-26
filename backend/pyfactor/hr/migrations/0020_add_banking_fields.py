# Generated manually to add missing banking fields to Employee model

from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0019_change_timeoffrequest_approved_by_to_user'),
    ]

    operations = [
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
    ]