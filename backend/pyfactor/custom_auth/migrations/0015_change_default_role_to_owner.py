# Generated manually on 2025-07-11
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0014_auto_20250528_0954'),  # Update this to the latest migration
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