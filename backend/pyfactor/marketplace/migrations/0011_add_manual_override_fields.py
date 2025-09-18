# Generated migration for adding manual override fields to BusinessListing

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0010_add_tenant_uuid_and_rating_fields'),  # Latest migration
    ]

    operations = [
        migrations.AddField(
            model_name='businesslisting',
            name='manual_override',
            field=models.BooleanField(default=False, help_text='Whether open/closed status is manually overridden'),
        ),
        migrations.AddField(
            model_name='businesslisting',
            name='manual_override_expires',
            field=models.DateTimeField(blank=True, help_text='When the manual override expires', null=True),
        ),
    ]