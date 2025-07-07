# Generated manually for adding is_active field to Vendor model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0002_vendor_is_1099_vendor_vendor_tax_id_purchase'),
    ]

    operations = [
        migrations.AddField(
            model_name='vendor',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
    ]