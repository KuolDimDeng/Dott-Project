# Generated migration for material tracking features

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
from decimal import Decimal
from django.core.validators import MinValueValidator
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0002_auto_20250101_0000'),  # Update this to your latest migration
        ('custom_auth', '0001_initial'),
    ]

    operations = [
        # Add new fields to Product model
        migrations.AddField(
            model_name='product',
            name='material_type',
            field=models.CharField(
                choices=[
                    ('consumable', 'Consumable (depletes with use)'),
                    ('reusable', 'Reusable/Tool (doesn\'t deplete)'),
                    ('service', 'Service (no physical item)')
                ],
                default='consumable',
                help_text='Consumables deplete when used, reusables/tools do not',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='product',
            name='reorder_level',
            field=models.IntegerField(default=0, help_text='Minimum quantity before reorder alert'),
        ),
        migrations.AddField(
            model_name='product',
            name='unit',
            field=models.CharField(default='units', help_text='Unit of measurement (units, lbs, kg, etc.)', max_length=50),
        ),
        
        # Create BillOfMaterials model
        migrations.CreateModel(
            name='BillOfMaterials',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=255)),
                ('quantity_required', models.DecimalField(
                    decimal_places=2,
                    help_text='Quantity of material needed per unit of product',
                    max_digits=10,
                    validators=[MinValueValidator(Decimal('0.01'))]
                )),
                ('notes', models.TextField(blank=True, help_text='Special instructions for using this material', null=True)),
                ('is_optional', models.BooleanField(default=False, help_text='Is this material optional for the product?')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('material', models.ForeignKey(
                    limit_choices_to={'inventory_type': 'supply'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='used_in_products',
                    to='inventory.product'
                )),
                ('product', models.ForeignKey(
                    limit_choices_to={'inventory_type': 'product'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='bill_of_materials',
                    to='inventory.product'
                )),
            ],
            options={
                'verbose_name': 'Bill of Materials',
                'verbose_name_plural': 'Bills of Materials',
                'db_table': 'inventory_billofmaterials',
                'indexes': [
                    models.Index(fields=['tenant_id', 'product'], name='inventory_b_tenant__0a1b2c_idx'),
                    models.Index(fields=['tenant_id', 'material'], name='inventory_b_tenant__0d1e2f_idx'),
                ],
            },
            bases=(models.Model,),
        ),
        
        # Create ServiceMaterials model
        migrations.CreateModel(
            name='ServiceMaterials',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=255)),
                ('quantity_required', models.DecimalField(
                    decimal_places=2,
                    help_text='Typical quantity of material needed per service',
                    max_digits=10,
                    validators=[MinValueValidator(Decimal('0.01'))]
                )),
                ('notes', models.TextField(blank=True, help_text='Special instructions for using this material', null=True)),
                ('is_optional', models.BooleanField(default=False, help_text='Is this material optional for the service?')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('material', models.ForeignKey(
                    limit_choices_to={'inventory_type': 'supply'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='used_in_services',
                    to='inventory.product'
                )),
                ('service', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='service_materials',
                    to='inventory.service'
                )),
            ],
            options={
                'verbose_name': 'Service Materials',
                'verbose_name_plural': 'Service Materials',
                'db_table': 'inventory_servicematerials',
                'indexes': [
                    models.Index(fields=['tenant_id', 'service'], name='inventory_s_tenant__1a2b3c_idx'),
                    models.Index(fields=['tenant_id', 'material'], name='inventory_s_tenant__1d2e3f_idx'),
                ],
            },
            bases=(models.Model,),
        ),
        
        # Add unique constraints
        migrations.AddConstraint(
            model_name='billofmaterials',
            constraint=models.UniqueConstraint(
                fields=['tenant_id', 'product', 'material'],
                name='unique_product_material_per_tenant'
            ),
        ),
        migrations.AddConstraint(
            model_name='servicematerials',
            constraint=models.UniqueConstraint(
                fields=['tenant_id', 'service', 'material'],
                name='unique_service_material_per_tenant'
            ),
        ),
    ]