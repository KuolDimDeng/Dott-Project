# Generated manually on 2025-07-11
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0015_add_user_profile_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                max_length=10,
                choices=[
                    ('OWNER', 'Owner'),
                    ('ADMIN', 'Admin'),
                    ('USER', 'User'),
                ],
                default='OWNER'  # Changed from 'USER' to 'OWNER'
            ),
        ),
    ]