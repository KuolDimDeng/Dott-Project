# Generated manually to fix items field default from dict to list

from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0013_add_missing_order_columns'),
    ]

    operations = [
        migrations.AlterField(
            model_name='consumerorder',
            name='items',
            field=models.JSONField(default=list),
        ),
    ]