# Generated migration to add is_active field to Customer model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0002_crm_customer_new_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='is_active',
            field=models.BooleanField(default=True, help_text='Whether this customer is active'),
        ),
    ]