# Generated migration for adding user profile fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0014_set_first_user_as_owner'),
    ]

    operations = [
        # Add given_name if it doesn't exist
        migrations.AddField(
            model_name='user',
            name='given_name',
            field=models.CharField(max_length=150, blank=True, null=True, help_text='Given/First name from Auth0'),
            preserve_default=True,
        ),
        # Add family_name if it doesn't exist
        migrations.AddField(
            model_name='user',
            name='family_name',
            field=models.CharField(max_length=150, blank=True, null=True, help_text='Family/Last name from Auth0'),
            preserve_default=True,
        ),
        # Add nickname if it doesn't exist
        migrations.AddField(
            model_name='user',
            name='nickname',
            field=models.CharField(max_length=150, blank=True, null=True, help_text='Nickname/Username from Auth0'),
            preserve_default=True,
        ),
        # Add MFA fields
        migrations.AddField(
            model_name='user',
            name='mfa_enabled',
            field=models.BooleanField(default=False, help_text='Whether MFA is enabled'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='user',
            name='subscription_status',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('active', 'Active'),
                    ('inactive', 'Inactive'),
                    ('cancelled', 'Cancelled'),
                    ('past_due', 'Past Due')
                ],
                default='active',
                help_text='Subscription status'
            ),
            preserve_default=True,
        ),
    ]