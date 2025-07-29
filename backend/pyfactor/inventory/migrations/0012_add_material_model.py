# Generated manually for Material model

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0011_auto_20240710_0000'),  # Update this to your latest migration
        ('users', '0001_initial'),
        ('jobs', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Material',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.UUIDField(blank=True, db_index=True, null=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(db_index=True, max_length=255)),
                ('sku', models.CharField(db_index=True, help_text='Stock Keeping Unit - unique identifier for this material', max_length=100, unique=True)),
                ('description', models.TextField(blank=True, null=True)),
                ('material_type', models.CharField(choices=[('raw_material', 'Raw Material'), ('consumable', 'Consumable Supply'), ('tool', 'Tool/Equipment'), ('part', 'Part/Component'), ('packaging', 'Packaging Material'), ('other', 'Other')], db_index=True, default='consumable', max_length=20)),
                ('quantity_in_stock', models.DecimalField(decimal_places=3, default=0, help_text='Current quantity in stock', max_digits=12)),
                ('unit', models.CharField(choices=[('kg', 'Kilogram'), ('g', 'Gram'), ('lb', 'Pound'), ('oz', 'Ounce'), ('l', 'Liter'), ('ml', 'Milliliter'), ('gal', 'Gallon'), ('fl_oz', 'Fluid Ounce'), ('m', 'Meter'), ('cm', 'Centimeter'), ('ft', 'Feet'), ('in', 'Inch'), ('unit', 'Unit'), ('piece', 'Piece'), ('box', 'Box'), ('pack', 'Pack'), ('roll', 'Roll'), ('sheet', 'Sheet'), ('custom', 'Custom Unit')], default='unit', max_length=20)),
                ('custom_unit', models.CharField(blank=True, help_text="Custom unit name if 'custom' is selected", max_length=50, null=True)),
                ('reorder_level', models.DecimalField(decimal_places=3, default=10, help_text='Minimum quantity before reordering', max_digits=12)),
                ('reorder_quantity', models.DecimalField(decimal_places=3, default=0, help_text='Quantity to order when stock is low', max_digits=12)),
                ('unit_cost', models.DecimalField(decimal_places=2, default=0, help_text='Cost per unit from supplier', max_digits=10)),
                ('last_purchase_price', models.DecimalField(blank=True, decimal_places=2, help_text='Price from last purchase', max_digits=10, null=True)),
                ('average_cost', models.DecimalField(blank=True, decimal_places=2, help_text='Weighted average cost', max_digits=10, null=True)),
                ('is_billable', models.BooleanField(default=False, help_text='Can this material be billed to customers when used?')),
                ('markup_percentage', models.DecimalField(decimal_places=2, default=0, help_text='Markup percentage when billing to customers', max_digits=5)),
                ('billing_price', models.DecimalField(blank=True, decimal_places=2, help_text='Price when billing to customers (auto-calculated if markup is set)', max_digits=10, null=True)),
                ('supplier_sku', models.CharField(blank=True, help_text="Supplier's SKU for this material", max_length=100, null=True)),
                ('lead_time_days', models.IntegerField(default=0, help_text='Lead time in days from supplier')),
                ('storage_requirements', models.TextField(blank=True, help_text='Special storage requirements (temperature, humidity, etc.)', null=True)),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('last_used_date', models.DateTimeField(blank=True, null=True)),
                ('last_purchase_date', models.DateTimeField(blank=True, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('location', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='materials', to='inventory.location')),
                ('supplier', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='materials', to='inventory.supplier')),
            ],
            options={
                'db_table': 'inventory_material',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='MaterialTransaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('transaction_type', models.CharField(choices=[('purchase', 'Purchase'), ('use', 'Used in Job/Service'), ('return', 'Returned to Supplier'), ('adjustment', 'Inventory Adjustment'), ('transfer', 'Transfer between Locations'), ('waste', 'Waste/Damage')], max_length=20)),
                ('quantity', models.DecimalField(decimal_places=3, help_text='Quantity involved in transaction (positive for additions, negative for removals)', max_digits=12)),
                ('unit_cost', models.DecimalField(blank=True, decimal_places=2, help_text='Cost per unit for this transaction', max_digits=10, null=True)),
                ('total_cost', models.DecimalField(blank=True, decimal_places=2, help_text='Total cost of this transaction', max_digits=12, null=True)),
                ('balance_after', models.DecimalField(decimal_places=3, help_text='Stock balance after this transaction', max_digits=12)),
                ('purchase_order', models.CharField(blank=True, help_text='Purchase order reference', max_length=100, null=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='material_transactions_created', to='users.user')),
                ('job', models.ForeignKey(blank=True, help_text='Job this material was used for', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='material_transactions', to='jobs.job')),
                ('material', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='inventory.material')),
            ],
            options={
                'db_table': 'inventory_material_transaction',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='material',
            index=models.Index(fields=['tenant_id', 'sku'], name='inventory_m_tenant__8f9e9a_idx'),
        ),
        migrations.AddIndex(
            model_name='material',
            index=models.Index(fields=['tenant_id', 'material_type'], name='inventory_m_tenant__c6b3d9_idx'),
        ),
        migrations.AddIndex(
            model_name='material',
            index=models.Index(fields=['tenant_id', 'is_active'], name='inventory_m_tenant__4e8c7f_idx'),
        ),
        migrations.AddIndex(
            model_name='material',
            index=models.Index(fields=['tenant_id', 'supplier'], name='inventory_m_tenant__2a1b3c_idx'),
        ),
        migrations.AddIndex(
            model_name='material',
            index=models.Index(fields=['quantity_in_stock', 'reorder_level'], name='inventory_m_quantit_7d8e2f_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='material',
            unique_together={('tenant_id', 'sku')},
        ),
        migrations.AddIndex(
            model_name='materialtransaction',
            index=models.Index(fields=['material', 'created_at'], name='inventory_m_materia_9a2c4d_idx'),
        ),
        migrations.AddIndex(
            model_name='materialtransaction',
            index=models.Index(fields=['transaction_type', 'created_at'], name='inventory_m_transac_6b3e5f_idx'),
        ),
    ]