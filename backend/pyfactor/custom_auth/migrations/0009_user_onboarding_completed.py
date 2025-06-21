# Generated migration for adding onboarding_completed field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0008_rename_custom_auth_accountdeletionlog_user_email_idx_custom_auth_user_em_b53a96_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='onboarding_completed',
            field=models.BooleanField(default=False, help_text='Whether user has completed onboarding'),
        ),
        migrations.AddField(
            model_name='user',
            name='onboarding_completed_at',
            field=models.DateTimeField(blank=True, null=True, help_text='When onboarding was completed'),
        ),
    ]