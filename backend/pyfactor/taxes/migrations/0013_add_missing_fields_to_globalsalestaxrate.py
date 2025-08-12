# Generated manually to add missing fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('taxes', '0012_add_global_sales_tax_rate'),
    ]

    operations = [
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='manually_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='manual_notes',
            field=models.TextField(blank=True),
        ),
    ]