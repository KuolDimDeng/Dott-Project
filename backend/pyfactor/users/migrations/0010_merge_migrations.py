# Merge migration to resolve conflicts

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0008_add_stripe_connect_fields'),
        ('users', '0009_add_stripe_payroll_fields'),
    ]

    operations = [
        # This is a merge migration - no operations needed
    ]