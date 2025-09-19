# Generated manually to fix JSON parsing error

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0016_merge_0002_add_pickup_pin_0015_add_service_fee_field'),
    ]

    operations = [
        migrations.AlterField(
            model_name='consumerorder',
            name='pickup_pin',
            field=models.CharField(blank=True, help_text='4-digit PIN restaurant gives to courier at pickup', max_length=4, null=True, default=None),
        ),
        migrations.AlterField(
            model_name='consumerorder',
            name='consumer_delivery_pin',
            field=models.CharField(blank=True, help_text='4-digit PIN consumer gives to courier at delivery', max_length=4, null=True, default=None),
        ),
        migrations.AlterField(
            model_name='consumerorder',
            name='delivery_pin',
            field=models.CharField(blank=True, help_text='4-digit PIN for delivery verification (restaurant to courier)', max_length=4, null=True, default=None),
        ),
    ]