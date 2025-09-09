# Generated migration for courier delivery enhancements
from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('couriers', '0001_initial'),  # Keep dependency on initial migration
    ]

    operations = [
        # Add new fields to CourierProfile
        migrations.AddField(
            model_name='courierprofile',
            name='delivery_categories',
            field=models.JSONField(blank=True, default=list, help_text='List of delivery categories: food, groceries, medicine, packages, documents, etc.'),
        ),
        migrations.AddField(
            model_name='courierprofile',
            name='operating_hours',
            field=models.JSONField(blank=True, default=dict, help_text='Operating hours per day: {"monday": {"start": "08:00", "end": "20:00", "is_open": true}, ...}'),
        ),
        migrations.AddField(
            model_name='courierprofile',
            name='is_online',
            field=models.BooleanField(default=False, help_text='Current availability status'),
        ),
        migrations.AddField(
            model_name='courierprofile',
            name='delivery_radius',
            field=models.IntegerField(default=10, help_text='Maximum delivery distance in kilometers', validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(50)]),
        ),
    ]