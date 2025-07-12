# Merge migration for users app
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_add_grace_period_fields'),
        ('users', '0008_remove_business_business_type'),
        ('users', '0009_add_user_timezone'),
        ('users', '0013_add_mobile_money_support'),
    ]

    operations = [
        # No actual operations needed - this is just a merge migration
    ]