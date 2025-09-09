# Generated migration for courier integration in orders
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0002_auto_20240101_0000'),  # Update with actual previous migration
        ('couriers', '0002_add_delivery_categories'),
    ]

    operations = [
        # Update order status choices to include courier states
        migrations.AlterField(
            model_name='consumerorder',
            name='order_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('business_accepted', 'Business Accepted'),
                    ('searching_courier', 'Searching for Courier'),
                    ('courier_assigned', 'Courier Assigned'),
                    ('preparing', 'Preparing'),
                    ('ready_for_pickup', 'Ready for Pickup'),
                    ('picked_up', 'Picked Up'),
                    ('in_transit', 'In Transit'),
                    ('arrived', 'Courier Arrived'),
                    ('delivered', 'Delivered'),
                    ('completed', 'Completed'),
                    ('cancelled', 'Cancelled'),
                    ('refunded', 'Refunded'),
                ],
                default='pending',
                max_length=20
            ),
        ),
        
        # Add courier fields
        migrations.AddField(
            model_name='consumerorder',
            name='courier',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='delivery_orders', to='couriers.courierprofile'),
        ),
        migrations.AddField(
            model_name='consumerorder',
            name='courier_assigned_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='consumerorder',
            name='courier_accepted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='consumerorder',
            name='courier_earnings',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        
        # Add PIN verification fields
        migrations.AddField(
            model_name='consumerorder',
            name='delivery_pin',
            field=models.CharField(blank=True, help_text='4-digit PIN for delivery verification', max_length=4),
        ),
        migrations.AddField(
            model_name='consumerorder',
            name='pin_generated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='consumerorder',
            name='pin_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='consumerorder',
            name='pin_verified_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]