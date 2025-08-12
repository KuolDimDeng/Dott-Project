# Generated manually for adding is_active field to Service model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0014_add_tax_exemption_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='is_active',
            field=models.BooleanField(default=True, db_index=True),
        ),
    ]