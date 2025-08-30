from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid

class Migration(migrations.Migration):
    
    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('marketplace', '0001_initial'),
    ]
    
    operations = [
        migrations.CreateModel(
            name='ConsumerOrder',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('order_number', models.CharField(max_length=20, unique=True)),
                ('consumer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='consumer_orders', to='auth.user')),
                ('business', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='business_orders', to='auth.user')),
                ('items', models.JSONField(default=dict)),
                ('subtotal', models.DecimalField(decimal_places=2, max_digits=12)),
                ('tax_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('delivery_fee', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('discount_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('total_amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('order_status', models.CharField(choices=[('pending', 'Pending'), ('confirmed', 'Confirmed'), ('preparing', 'Preparing'), ('ready', 'Ready for Delivery/Pickup'), ('out_for_delivery', 'Out for Delivery'), ('delivered', 'Delivered'), ('completed', 'Completed'), ('cancelled', 'Cancelled'), ('refunded', 'Refunded')], default='pending', max_length=20)),
                ('payment_status', models.CharField(choices=[('pending', 'Pending'), ('paid', 'Paid'), ('failed', 'Failed'), ('refunded', 'Refunded')], default='pending', max_length=20)),
                ('payment_method', models.CharField(choices=[('cash', 'Cash on Delivery'), ('card', 'Credit/Debit Card'), ('mpesa', 'M-Pesa'), ('bank_transfer', 'Bank Transfer')], default='cash', max_length=20)),
                ('delivery_address', models.TextField(blank=True)),
                ('delivery_notes', models.TextField(blank=True)),
                ('estimated_delivery_time', models.DateTimeField(blank=True, null=True)),
                ('actual_delivery_time', models.DateTimeField(blank=True, null=True)),
                ('created_from_chat', models.BooleanField(default=False)),
                ('chat_conversation_id', models.UUIDField(blank=True, null=True)),
                ('payment_intent_id', models.CharField(blank=True, max_length=200, null=True)),
                ('payment_transaction_id', models.CharField(blank=True, max_length=200, null=True)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('refunded_at', models.DateTimeField(blank=True, null=True)),
                ('refund_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('confirmed_at', models.DateTimeField(blank=True, null=True)),
                ('prepared_at', models.DateTimeField(blank=True, null=True)),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('cancelled_at', models.DateTimeField(blank=True, null=True)),
                ('cancellation_reason', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'marketplace_consumer_orders',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='OrderReview',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('order', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='review', to='marketplace.consumerorder')),
                ('product_rating', models.IntegerField(choices=[(1, 1), (2, 2), (3, 3), (4, 4), (5, 5)])),
                ('delivery_rating', models.IntegerField(blank=True, choices=[(1, 1), (2, 2), (3, 3), (4, 4), (5, 5)], null=True)),
                ('overall_rating', models.IntegerField(choices=[(1, 1), (2, 2), (3, 3), (4, 4), (5, 5)])),
                ('review_text', models.TextField(blank=True)),
                ('review_images', models.JSONField(blank=True, default=list)),
                ('business_response', models.TextField(blank=True)),
                ('business_response_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_verified_purchase', models.BooleanField(default=True)),
            ],
            options={
                'db_table': 'marketplace_order_reviews',
                'ordering': ['-created_at'],
            },
        ),
    ]