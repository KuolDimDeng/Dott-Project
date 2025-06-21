# Generated migration to add subscription_plan field to User model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0003_auto_20250118_0000'),  # Update this to match your latest migration
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='subscription_plan',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('free', 'Free'),
                    ('professional', 'Professional'),
                    ('enterprise', 'Enterprise')
                ],
                default='free',
                help_text='User subscription plan'
            ),
        ),
    ]