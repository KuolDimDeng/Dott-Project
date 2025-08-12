# Generated manually to add tenant_id field to AccountCategory

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0004_add_business_tenant_to_chartofaccount'),
    ]

    operations = [
        # Add tenant_id field to AccountCategory
        migrations.AddField(
            model_name='accountcategory',
            name='tenant_id',
            field=models.UUIDField(db_index=True, help_text='The tenant ID this record belongs to. Used by Row Level Security.', null=True),
            preserve_default=False,
        ),
    ]