# Generated migration for StoreItems models
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0017_add_business_type_inventory_config'),
    ]

    operations = [
        migrations.CreateModel(
            name='StoreItem',
            options={
                'db_table': 'store_items',
                'indexes': [
                    models.Index(fields=['barcode'], name='store_items_barcode_idx'),
                    models.Index(fields=['name', 'brand'], name='store_items_name_brand_idx'),
                    models.Index(fields=['category'], name='store_items_category_idx'),
                ],
            },
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('barcode', models.CharField(db_index=True, max_length=50, unique=True)),
                ('name', models.CharField(db_index=True, max_length=255)),
                ('brand', models.CharField(blank=True, max_length=100, null=True)),
                ('category', models.CharField(db_index=True, max_length=100)),
                ('subcategory', models.CharField(blank=True, max_length=100, null=True)),
                ('size', models.CharField(blank=True, max_length=50, null=True)),
                ('unit', models.CharField(blank=True, max_length=50, null=True)),
                ('description', models.TextField(blank=True, null=True)),
                ('image_url', models.URLField(blank=True, null=True)),
                ('region_code', models.CharField(blank=True, db_index=True, max_length=10, null=True)),
                ('verified', models.BooleanField(default=False)),
                ('verification_count', models.IntegerField(default=0)),
                ('created_by_merchant_id', models.IntegerField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='MerchantStoreItem',
            options={
                'db_table': 'merchant_store_items',
                'unique_together': {('merchant_id', 'store_item')},
                'indexes': [
                    models.Index(fields=['merchant_id'], name='merchant_store_items_merchant_idx'),
                    models.Index(fields=['last_sold_at'], name='merchant_store_items_sold_idx'),
                ],
            },
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('merchant_id', models.IntegerField(db_index=True)),
                ('store_item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='merchant_items', to='inventory.storeitem')),
                ('sell_price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('cost_price', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('stock_quantity', models.IntegerField(default=0)),
                ('min_stock', models.IntegerField(default=10)),
                ('is_active', models.BooleanField(default=True)),
                ('last_sold_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='StoreItemVerification',
            options={
                'db_table': 'store_item_verifications',
                'unique_together': {('store_item', 'merchant_id')},
            },
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('store_item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='verifications', to='inventory.storeitem')),
                ('merchant_id', models.IntegerField()),
                ('is_correct', models.BooleanField(default=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('verified_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='StoreItemPriceHistory',
            options={
                'db_table': 'store_item_price_history',
                'indexes': [
                    models.Index(fields=['store_item', '-recorded_at'], name='price_history_item_date_idx'),
                    models.Index(fields=['location'], name='price_history_location_idx'),
                ],
            },
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('store_item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='price_history', to='inventory.storeitem')),
                ('merchant_id', models.IntegerField()),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('location', models.CharField(blank=True, max_length=100, null=True)),
                ('recorded_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        # Add foreign key from Product to StoreItem
        migrations.AddField(
            model_name='product',
            name='store_item',
            field=models.ForeignKey(blank=True, help_text='Link to global product catalog', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='merchant_products', to='inventory.storeitem'),
        ),
        migrations.AddField(
            model_name='product',
            name='barcode',
            field=models.CharField(blank=True, db_index=True, help_text='Product barcode for scanning', max_length=50, null=True),
        ),
    ]