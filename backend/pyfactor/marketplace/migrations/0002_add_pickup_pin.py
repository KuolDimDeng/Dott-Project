# Generated migration to add missing pickup_pin column

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0001_initial'),  # Update this to your latest migration
    ]

    operations = [
        migrations.AddField(
            model_name='consumerorder',
            name='pickup_pin',
            field=models.CharField(max_length=6, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='consumerorder',
            name='delivery_pin',
            field=models.CharField(max_length=6, null=True, blank=True),
        ),
    ]