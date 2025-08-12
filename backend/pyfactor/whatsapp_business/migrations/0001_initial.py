# Generated migration for WhatsApp Business models
import django.db.models.deletion
import uuid
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('custom_auth', '0019_passwordresettoken'),  # Latest custom_auth migration
        ('inventory', '0008_remove_service_inventory_s_name_80acbf_idx_and_more'),  # Latest inventory migration
    ]

    operations = [
        migrations.CreateModel(
            name='WhatsAppBusinessSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_enabled', models.BooleanField(default=True)),
                ('business_name', models.CharField(blank=True, max_length=255, null=True)),
                ('business_description', models.TextField(blank=True, null=True)),
                ('whatsapp_number', models.CharField(blank=True, max_length=20, null=True)),
                ('welcome_message', models.TextField(default='Welcome to our business! Browse our catalog and shop with ease.')),
                ('auto_reply_enabled', models.BooleanField(default=True)),
                ('catalog_enabled', models.BooleanField(default=True)),
                ('payment_enabled', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='whatsapp_business_settings', to='custom_auth.tenant')),
            ],
            options={
                'db_table': 'whatsapp_business_settings',
            },
        ),
        migrations.CreateModel(
            name='WhatsAppCatalog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('catalog_url', models.URLField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='whatsapp_catalogs', to='custom_auth.tenant')),
            ],
            options={
                'db_table': 'whatsapp_catalogs',
            },
        ),
        migrations.CreateModel(
            name='WhatsAppProduct',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('item_type', models.CharField(choices=[('product', 'Physical Product'), ('service', 'Service'), ('digital', 'Digital Product')], default='product', max_length=20)),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('price_type', models.CharField(choices=[('fixed', 'Fixed Price'), ('hourly', 'Per Hour'), ('daily', 'Per Day'), ('project', 'Per Project'), ('quote', 'Quote on Request')], default='fixed', max_length=20)),
                ('currency', models.CharField(choices=[('USD', 'US Dollar'), ('KES', 'Kenyan Shilling'), ('NGN', 'Nigerian Naira'), ('GHS', 'Ghanaian Cedi'), ('UGX', 'Ugandan Shilling'), ('RWF', 'Rwandan Franc'), ('TZS', 'Tanzanian Shilling'), ('EUR', 'Euro'), ('GBP', 'British Pound')], default='USD', max_length=3)),
                ('image_url', models.URLField(blank=True, null=True)),
                ('sku', models.CharField(blank=True, max_length=100, null=True)),
                ('stock_quantity', models.IntegerField(default=0)),
                ('is_available', models.BooleanField(default=True)),
                ('category', models.CharField(blank=True, max_length=100, null=True)),
                ('duration_minutes', models.IntegerField(blank=True, null=True)),
                ('service_location', models.CharField(blank=True, choices=[('onsite', 'On-site at Customer Location'), ('remote', 'Remote/Online'), ('shop', 'At Business Location'), ('flexible', 'Flexible')], max_length=50, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('catalog', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='products', to='whatsapp_business.whatsappcatalog')),
                ('linked_product', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='whatsapp_products', to='inventory.product')),
            ],
            options={
                'db_table': 'whatsapp_products',
            },
        ),
        migrations.CreateModel(
            name='WhatsAppOrder',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('customer_phone', models.CharField(max_length=20)),
                ('customer_name', models.CharField(blank=True, max_length=255, null=True)),
                ('customer_address', models.TextField(blank=True, null=True)),
                ('total_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('currency', models.CharField(choices=[('USD', 'US Dollar'), ('KES', 'Kenyan Shilling'), ('NGN', 'Nigerian Naira'), ('GHS', 'Ghanaian Cedi'), ('UGX', 'Ugandan Shilling'), ('RWF', 'Rwandan Franc'), ('TZS', 'Tanzanian Shilling'), ('EUR', 'Euro'), ('GBP', 'British Pound')], default='USD', max_length=3)),
                ('order_status', models.CharField(choices=[('pending', 'Pending'), ('confirmed', 'Confirmed'), ('processing', 'Processing'), ('shipped', 'Shipped'), ('delivered', 'Delivered'), ('cancelled', 'Cancelled')], default='pending', max_length=20)),
                ('payment_status', models.CharField(choices=[('pending', 'Pending'), ('paid', 'Paid'), ('failed', 'Failed'), ('refunded', 'Refunded')], default='pending', max_length=20)),
                ('payment_method', models.CharField(blank=True, choices=[('mpesa', 'M-Pesa'), ('card', 'Credit/Debit Card'), ('bank_transfer', 'Bank Transfer'), ('cod', 'Cash on Delivery')], max_length=20, null=True)),
                ('payment_reference', models.CharField(blank=True, max_length=100, null=True)),
                ('payment_link', models.URLField(blank=True, null=True)),
                ('dott_fee_amount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('dott_fee_currency', models.CharField(default='USD', max_length=3)),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='whatsapp_orders', to='custom_auth.tenant')),
            ],
            options={
                'db_table': 'whatsapp_orders',
            },
        ),
        migrations.CreateModel(
            name='WhatsAppOrderItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.IntegerField(default=1)),
                ('unit_price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('total_price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='whatsapp_business.whatsapporder')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='whatsapp_business.whatsappproduct')),
            ],
            options={
                'db_table': 'whatsapp_order_items',
            },
        ),
        migrations.CreateModel(
            name='WhatsAppMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('recipient_phone', models.CharField(max_length=20)),
                ('message_type', models.CharField(choices=[('catalog_share', 'Catalog Share'), ('order_confirmation', 'Order Confirmation'), ('payment_link', 'Payment Link'), ('status_update', 'Status Update'), ('customer_support', 'Customer Support')], max_length=20)),
                ('message_content', models.TextField()),
                ('whatsapp_message_id', models.CharField(blank=True, max_length=100, null=True)),
                ('status', models.CharField(choices=[('sent', 'Sent'), ('delivered', 'Delivered'), ('read', 'Read'), ('failed', 'Failed')], default='sent', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('related_order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='messages', to='whatsapp_business.whatsapporder')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='whatsapp_messages', to='custom_auth.tenant')),
            ],
            options={
                'db_table': 'whatsapp_messages',
            },
        ),
        migrations.CreateModel(
            name='WhatsAppAnalytics',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('messages_sent', models.IntegerField(default=0)),
                ('messages_delivered', models.IntegerField(default=0)),
                ('messages_read', models.IntegerField(default=0)),
                ('catalog_shares', models.IntegerField(default=0)),
                ('catalog_views', models.IntegerField(default=0)),
                ('orders_initiated', models.IntegerField(default=0)),
                ('orders_completed', models.IntegerField(default=0)),
                ('orders_cancelled', models.IntegerField(default=0)),
                ('total_revenue', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('dott_fees_collected', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='whatsapp_analytics', to='custom_auth.tenant')),
            ],
            options={
                'db_table': 'whatsapp_analytics',
            },
        ),
        migrations.AddConstraint(
            model_name='whatsappanalytics',
            constraint=models.UniqueConstraint(fields=('tenant', 'date'), name='whatsapp_analytics_tenant_date_unique'),
        ),
    ]