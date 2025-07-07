# Generated manually for adding Stripe Connect fields to Business model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_userprofile_metadata_and_more'),  # Adjust this to the latest migration
    ]

    operations = [
        migrations.AddField(
            model_name='business',
            name='stripe_account_id',
            field=models.CharField(blank=True, help_text='Stripe Connect Express account ID', max_length=255, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='business',
            name='stripe_onboarding_complete',
            field=models.BooleanField(default=False, help_text='Whether Stripe Connect onboarding is complete'),
        ),
        migrations.AddField(
            model_name='business',
            name='stripe_charges_enabled',
            field=models.BooleanField(default=False, help_text='Whether the connected account can accept charges'),
        ),
        migrations.AddField(
            model_name='business',
            name='stripe_payouts_enabled',
            field=models.BooleanField(default=False, help_text='Whether the connected account can receive payouts'),
        ),
    ]