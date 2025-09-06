# Generated migration for business type inventory configuration

from django.db import migrations, models
import django.db.models.deletion
import uuid


def create_default_inventory_configs(apps, schema_editor):
    """Create default inventory configurations for existing businesses"""
    Business = apps.get_model('users', 'Business')
    BusinessInventoryConfig = apps.get_model('inventory', 'BusinessInventoryConfig')
    
    # Default configurations by business type
    configs = {
        'RESTAURANT_CAFE': {
            'inventory_term': 'Ingredients & Supplies',
            'item_singular': 'Ingredient',
            'item_plural': 'Ingredients',
            'default_categories': ['Food Items', 'Beverages', 'Packaging', 'Cleaning'],
            'required_fields': ['name', 'quantity_on_hand', 'expiry_date'],
            'features': {
                'expiryTracking': True,
                'recipeCosting': True,
                'wasteTracking': True,
                'temperatureMonitoring': True
            }
        },
        'PLUMBER': {
            'inventory_term': 'Parts & Tools',
            'item_singular': 'Part',
            'item_plural': 'Parts',
            'default_categories': ['Tools', 'Pipes & Fittings', 'Valves', 'Sealants'],
            'required_fields': ['name', 'quantity_on_hand', 'material_type'],
            'features': {
                'billOfMaterials': True,
                'jobLinking': True,
                'toolCheckout': True
            }
        },
        'PHARMACY': {
            'inventory_term': 'Medications',
            'item_singular': 'Medication',
            'item_plural': 'Medications',
            'default_categories': ['Prescription Drugs', 'OTC Medications', 'Health Products'],
            'required_fields': ['name', 'batch_number', 'expiry_date', 'manufacturer'],
            'features': {
                'batchTracking': True,
                'expiryTracking': True,
                'prescriptionTracking': True,
                'regulatoryCompliance': True
            }
        },
        'RETAIL_STORE': {
            'inventory_term': 'Products',
            'item_singular': 'Product',
            'item_plural': 'Products',
            'default_categories': ['General'],
            'required_fields': ['name', 'sku', 'price', 'quantity_on_hand'],
            'features': {
                'barcodeScanning': True,
                'categoryManagement': True,
                'posIntegration': True
            }
        }
    }
    
    # Create configs for existing businesses
    for business in Business.objects.all():
        business_type = business.business_type or 'OTHER'
        config_data = configs.get(business_type, {
            'inventory_term': 'Inventory',
            'item_singular': 'Item',
            'item_plural': 'Items',
            'default_categories': ['General'],
            'required_fields': ['name', 'quantity_on_hand'],
            'features': {}
        })
        
        BusinessInventoryConfig.objects.get_or_create(
            tenant=business.tenant,
            business_type=business_type,
            defaults=config_data
        )


def create_sample_inventory_templates(apps, schema_editor):
    """Create sample inventory templates for common business types"""
    InventoryTemplate = apps.get_model('inventory', 'InventoryTemplate')
    
    templates = [
        # Restaurant templates
        {
            'business_type': 'RESTAURANT_CAFE',
            'category': 'Food Items',
            'name': 'Fresh Vegetables',
            'default_unit': 'kg',
            'material_type': 'consumable',
            'typical_price_range': {'min': 2, 'max': 10}
        },
        {
            'business_type': 'RESTAURANT_CAFE',
            'category': 'Beverages',
            'name': 'Coffee Beans',
            'default_unit': 'kg',
            'material_type': 'consumable',
            'typical_price_range': {'min': 15, 'max': 50}
        },
        # Plumber templates
        {
            'business_type': 'PLUMBER',
            'category': 'Pipes & Fittings',
            'name': 'Copper Pipe 1/2"',
            'default_unit': 'feet',
            'material_type': 'consumable',
            'typical_price_range': {'min': 3, 'max': 8}
        },
        {
            'business_type': 'PLUMBER',
            'category': 'Tools',
            'name': 'Pipe Wrench 14"',
            'default_unit': 'each',
            'material_type': 'reusable',
            'typical_price_range': {'min': 25, 'max': 60}
        },
        # Pharmacy templates
        {
            'business_type': 'PHARMACY',
            'category': 'OTC Medications',
            'name': 'Acetaminophen 500mg',
            'default_unit': 'bottle',
            'material_type': 'consumable',
            'typical_price_range': {'min': 5, 'max': 15}
        },
        # Salon templates
        {
            'business_type': 'SALON_SPA',
            'category': 'Hair Color',
            'name': 'Professional Hair Color',
            'default_unit': 'tube',
            'material_type': 'consumable',
            'typical_price_range': {'min': 8, 'max': 25}
        }
    ]
    
    for template_data in templates:
        InventoryTemplate.objects.get_or_create(
            business_type=template_data['business_type'],
            name=template_data['name'],
            defaults=template_data
        )


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0016_add_customer_to_service'),
        ('users', '0128_add_progressive_registration_fields'),
    ]

    operations = [
        # Create BusinessInventoryConfig model
        migrations.CreateModel(
            name='BusinessInventoryConfig',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('business_type', models.CharField(max_length=50)),
                ('inventory_term', models.CharField(default='Inventory', max_length=50)),
                ('item_singular', models.CharField(default='Item', max_length=50)),
                ('item_plural', models.CharField(default='Items', max_length=50)),
                ('default_categories', models.JSONField(default=list)),
                ('required_fields', models.JSONField(default=list)),
                ('optional_fields', models.JSONField(default=list)),
                ('hidden_fields', models.JSONField(default=list)),
                ('features', models.JSONField(default=dict)),
                ('show_in_menu', models.BooleanField(default=True)),
                ('menu_icon', models.CharField(default='cube-outline', max_length=50)),
                ('menu_position', models.IntegerField(default=3)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
            ],
            options={
                'db_table': 'inventory_business_config',
                'unique_together': {('tenant', 'business_type')},
            },
        ),
        
        # Create InventoryTemplate model
        migrations.CreateModel(
            name='InventoryTemplate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('business_type', models.CharField(max_length=50)),
                ('category', models.CharField(max_length=100)),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('default_unit', models.CharField(max_length=50)),
                ('material_type', models.CharField(
                    choices=[
                        ('consumable', 'Consumable'),
                        ('reusable', 'Reusable'),
                        ('service', 'Service')
                    ],
                    default='consumable',
                    max_length=20
                )),
                ('is_commonly_used', models.BooleanField(default=True)),
                ('typical_price_range', models.JSONField(default=dict)),
                ('tags', models.JSONField(default=list)),
                ('search_keywords', models.TextField(blank=True)),
            ],
            options={
                'db_table': 'inventory_templates',
                'indexes': [
                    models.Index(fields=['business_type', 'category'], name='inventory_t_busines_2d4f3a_idx'),
                ],
            },
        ),
        
        # Add new fields to Product model
        migrations.AddField(
            model_name='product',
            name='inventory_type',
            field=models.CharField(
                choices=[
                    ('product', 'Product for Sale'),
                    ('service_supply', 'Service Supply'),
                    ('rental', 'Rental Item'),
                    ('ingredient', 'Ingredient/Component'),
                    ('equipment', 'Equipment/Tool'),
                    ('digital', 'Digital Product'),
                ],
                default='product',
                max_length=20
            ),
        ),
        
        # Rental-specific fields
        migrations.AddField(
            model_name='product',
            name='rental_daily_rate',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='product',
            name='rental_weekly_rate',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='product',
            name='rental_deposit',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='product',
            name='max_rental_days',
            field=models.IntegerField(blank=True, null=True),
        ),
        
        # Food service specific fields
        migrations.AddField(
            model_name='product',
            name='expiry_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='product',
            name='storage_temperature',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='product',
            name='allergen_info',
            field=models.JSONField(blank=True, default=list),
        ),
        
        # Healthcare specific fields
        migrations.AddField(
            model_name='product',
            name='batch_number',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='product',
            name='manufacturer',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='product',
            name='prescription_required',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='product',
            name='controlled_substance_schedule',
            field=models.CharField(blank=True, max_length=10),
        ),
        
        # Add new fields to Service model
        migrations.AddField(
            model_name='service',
            name='service_type',
            field=models.CharField(
                choices=[
                    ('fixed_duration', 'Fixed Duration Service'),
                    ('hourly', 'Hourly Service'),
                    ('project', 'Project-Based Service'),
                    ('subscription', 'Subscription Service'),
                    ('appointment', 'Appointment-Based Service'),
                ],
                default='fixed_duration',
                max_length=30
            ),
        ),
        migrations.AddField(
            model_name='service',
            name='default_duration',
            field=models.DurationField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='service',
            name='requires_appointment',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='service',
            name='max_concurrent_bookings',
            field=models.IntegerField(default=1),
        ),
        migrations.AddField(
            model_name='service',
            name='buffer_time_minutes',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='service',
            name='service_location',
            field=models.CharField(
                choices=[
                    ('on_site', 'At Customer Location'),
                    ('in_house', 'At Business Location'),
                    ('remote', 'Remote/Online'),
                    ('flexible', 'Flexible'),
                ],
                default='flexible',
                max_length=20
            ),
        ),
        
        # Run data migrations
        migrations.RunPython(create_default_inventory_configs, migrations.RunPython.noop),
        migrations.RunPython(create_sample_inventory_templates, migrations.RunPython.noop),
    ]