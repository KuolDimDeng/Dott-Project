# Merge migration for hr app
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0004_add_date_of_birth'),
        ('hr', '0015_add_geofencing'),
        ('hr', '0999_refactor_employee_model'),
    ]

    operations = [
        # No actual operations needed - this is just a merge migration
    ]