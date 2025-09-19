# Generated migration to add missing order verification columns

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0012_add_tip_amount_to_order'),
    ]

    operations = [
        # Add consumer_delivery_pin if it doesn't exist
        migrations.AddField(
            model_name='consumerorder',
            name='consumer_delivery_pin',
            field=models.CharField(max_length=6, null=True, blank=True),
        ),
        # Add pickup_verified if it doesn't exist
        migrations.AddField(
            model_name='consumerorder',
            name='pickup_verified',
            field=models.BooleanField(default=False),
        ),
        # Add delivery_verified if it doesn't exist
        migrations.AddField(
            model_name='consumerorder',
            name='delivery_verified',
            field=models.BooleanField(default=False),
        ),
        # Add pickup_verified_at if it doesn't exist
        migrations.AddField(
            model_name='consumerorder',
            name='pickup_verified_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        # Add courier_confirmed_pickup if it doesn't exist
        migrations.AddField(
            model_name='consumerorder',
            name='courier_confirmed_pickup',
            field=models.BooleanField(default=False),
        ),
        # Add courier_confirmed_delivery if it doesn't exist
        migrations.AddField(
            model_name='consumerorder',
            name='courier_confirmed_delivery',
            field=models.BooleanField(default=False),
        ),
    ]