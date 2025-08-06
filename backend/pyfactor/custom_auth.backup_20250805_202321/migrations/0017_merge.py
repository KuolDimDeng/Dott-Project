# Merge migration for custom_auth app
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0002_add_user_timezone'),
        ('custom_auth', '0016_change_default_role_to_owner'),
    ]

    operations = [
        # No actual operations needed - this is just a merge migration
    ]