# Generated migration for adding is_active field to Customer model

from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0007_add_county_and_tax_exempt_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='is_active',
            field=models.BooleanField(default=True, help_text='Whether this customer is active'),
        ),
    ]