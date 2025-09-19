# Generated manually to add service_fee field

from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0014_fix_items_default_to_list'),
    ]

    operations = [
        migrations.AddField(
            model_name='consumerorder',
            name='service_fee',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]