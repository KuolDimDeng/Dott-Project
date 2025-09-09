# Idempotent initial migration for couriers app
from django.conf import settings
import django.contrib.postgres.fields
import django.core.validators
from django.db import migrations, models, connection
import django.db.models.deletion
import uuid
from decimal import Decimal


def create_courier_tables_idempotent(apps, schema_editor):
    """Create courier tables only if they don't exist"""
    with schema_editor.connection.cursor() as cursor:
        # Check if all tables already exist
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name IN (
                'couriers_couriercompany',
                'couriers_couriercompanybranch', 
                'couriers_courierprofile',
                'couriers_deliveryorder',
                'couriers_courierearnings'
            );
        """)
        existing_count = cursor.fetchone()[0]
        
        if existing_count == 5:
            print("✅ All courier tables already exist, skipping creation")
            return
        elif existing_count > 0:
            print(f"⚠️ Found {existing_count}/5 courier tables. Dropping all for clean recreation.")
            # Drop any partial tables
            for table in ['couriers_deliveryorder', 'couriers_courierearnings', 
                         'couriers_courierprofile', 'couriers_couriercompanybranch',
                         'couriers_couriercompany']:
                cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")
            print("✅ Dropped existing partial tables")
    
    # Let Django create the tables through normal migration
    print("Creating courier tables...")


def reverse_courier_tables(apps, schema_editor):
    """Reverse migration - drop courier tables"""
    with schema_editor.connection.cursor() as cursor:
        for table in ['couriers_deliveryorder', 'couriers_courierearnings', 
                     'couriers_courierprofile', 'couriers_couriercompanybranch',
                     'couriers_couriercompany']:
            cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('custom_auth', '0001_initial'),
        ('users', '0001_initial'),
        ('transport', '0001_ensure_base_tables'),
    ]

    operations = [
        migrations.RunPython(create_courier_tables_idempotent, reverse_courier_tables),
        migrations.CreateModel(
            name='CourierCompany',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('legal_name', models.CharField(max_length=200)),
                ('registration_number', models.CharField(max_length=100, unique=True)),
                ('email', models.EmailField(max_length=254)),
                ('phone', models.CharField(max_length=20)),
                ('website', models.URLField(blank=True)),
                ('headquarters_address', models.TextField()),
                ('headquarters_city', models.CharField(max_length=100)),
                ('headquarters_country', models.CharField(max_length=2)),
                ('coverage_cities', django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=100), default=list, size=None)),
                ('coverage_countries', django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=2), default=list, size=None)),
                ('fleet_size', models.IntegerField(default=0)),
                ('established_date', models.DateField(blank=True, null=True)),
                ('commission_rate', models.DecimalField(decimal_places=2, default=Decimal('15.00'), max_digits=5, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(50)])),
                ('payment_terms_days', models.IntegerField(default=7)),
                ('insurance_provider', models.CharField(blank=True, max_length=200)),
                ('insurance_policy_number', models.CharField(blank=True, max_length=100)),
                ('insurance_expiry', models.DateField(blank=True, null=True)),
                ('tax_id', models.CharField(blank=True, max_length=100)),
                ('bank_name', models.CharField(blank=True, max_length=100)),
                ('bank_account_name', models.CharField(blank=True, max_length=200)),
                ('bank_account_number', models.CharField(blank=True, max_length=100)),
                ('bank_routing_number', models.CharField(blank=True, max_length=100)),
                ('mobile_money_provider', models.CharField(blank=True, max_length=50)),
                ('mobile_money_number', models.CharField(blank=True, max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('is_verified', models.BooleanField(default=False)),
                ('verification_date', models.DateTimeField(blank=True, null=True)),
                ('verification_documents', models.JSONField(default=dict)),
                ('rating', models.DecimalField(decimal_places=2, default=Decimal('5.00'), max_digits=3)),
                ('total_deliveries', models.IntegerField(default=0)),
                ('successful_deliveries', models.IntegerField(default=0)),
                ('total_revenue', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
            ],
            options={
                'db_table': 'couriers_couriercompany',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='CourierCompanyBranch',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('address', models.TextField()),
                ('city', models.CharField(max_length=100)),
                ('country', models.CharField(max_length=2)),
                ('phone', models.CharField(max_length=20)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('manager_name', models.CharField(blank=True, max_length=200)),
                ('manager_phone', models.CharField(blank=True, max_length=20)),
                ('manager_email', models.EmailField(blank=True, max_length=254)),
                ('operating_hours', models.JSONField(default=dict)),
                ('coverage_area', models.JSONField(default=dict)),
                ('fleet_size', models.IntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='branches', to='couriers.couriercompany')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
            ],
            options={
                'db_table': 'couriers_couriercompanybranch',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='CourierProfile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('first_name', models.CharField(max_length=100)),
                ('last_name', models.CharField(max_length=100)),
                ('phone', models.CharField(max_length=20, unique=True)),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('date_of_birth', models.DateField(blank=True, null=True)),
                ('national_id', models.CharField(max_length=50, unique=True)),
                ('address', models.TextField()),
                ('city', models.CharField(max_length=100)),
                ('country', models.CharField(max_length=2)),
                ('vehicle_type', models.CharField(choices=[('bicycle', 'Bicycle'), ('motorcycle', 'Motorcycle'), ('car', 'Car'), ('van', 'Van'), ('truck', 'Truck'), ('scooter', 'Electric Scooter')], max_length=20)),
                ('vehicle_make', models.CharField(blank=True, max_length=100)),
                ('vehicle_model', models.CharField(blank=True, max_length=100)),
                ('vehicle_year', models.IntegerField(blank=True, null=True)),
                ('vehicle_color', models.CharField(blank=True, max_length=50)),
                ('vehicle_registration', models.CharField(max_length=100, unique=True)),
                ('license_number', models.CharField(max_length=100, unique=True)),
                ('license_expiry', models.DateField()),
                ('insurance_provider', models.CharField(blank=True, max_length=200)),
                ('insurance_policy_number', models.CharField(blank=True, max_length=100)),
                ('insurance_expiry', models.DateField(blank=True, null=True)),
                ('delivery_categories', models.JSONField(default=list, blank=True)),
                ('operating_hours', models.JSONField(default=dict, blank=True)),
                ('is_online', models.BooleanField(default=False)),
                ('last_location_lat', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('last_location_lng', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('last_location_update', models.DateTimeField(blank=True, null=True)),
                ('delivery_radius', models.IntegerField(default=10)),
                ('bank_name', models.CharField(blank=True, max_length=100)),
                ('bank_account_name', models.CharField(blank=True, max_length=200)),
                ('bank_account_number', models.CharField(blank=True, max_length=100)),
                ('bank_routing_number', models.CharField(blank=True, max_length=100)),
                ('mobile_money_provider', models.CharField(blank=True, max_length=50)),
                ('mobile_money_number', models.CharField(blank=True, max_length=20)),
                ('preferred_payment_method', models.CharField(choices=[('bank_transfer', 'Bank Transfer'), ('mobile_money', 'Mobile Money'), ('cash', 'Cash Pickup')], default='mobile_money', max_length=20)),
                ('emergency_contact_name', models.CharField(max_length=200)),
                ('emergency_contact_phone', models.CharField(max_length=20)),
                ('emergency_contact_relationship', models.CharField(max_length=100)),
                ('is_active', models.BooleanField(default=True)),
                ('is_verified', models.BooleanField(default=False)),
                ('is_independent', models.BooleanField(default=True)),
                ('verification_date', models.DateTimeField(blank=True, null=True)),
                ('verification_documents', models.JSONField(default=dict)),
                ('background_check_status', models.CharField(choices=[('pending', 'Pending'), ('in_progress', 'In Progress'), ('passed', 'Passed'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('background_check_date', models.DateTimeField(blank=True, null=True)),
                ('rating', models.DecimalField(decimal_places=2, default=Decimal('5.00'), max_digits=3)),
                ('total_deliveries', models.IntegerField(default=0)),
                ('successful_deliveries', models.IntegerField(default=0)),
                ('failed_deliveries', models.IntegerField(default=0)),
                ('total_earnings', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
                ('current_balance', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('trust_level', models.IntegerField(default=1, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('company', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='couriers', to='couriers.couriercompany')),
                ('company_branch', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='couriers', to='couriers.couriercompanybranch')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='courier_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'couriers_courierprofile',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='DeliveryOrder',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('order_number', models.CharField(max_length=50, unique=True)),
                ('consumer_order_id', models.UUIDField(blank=True, null=True)),
                ('pickup_business_name', models.CharField(max_length=200)),
                ('pickup_contact_name', models.CharField(max_length=200)),
                ('pickup_phone', models.CharField(max_length=20)),
                ('pickup_address', models.TextField()),
                ('pickup_city', models.CharField(max_length=100)),
                ('pickup_lat', models.DecimalField(decimal_places=6, max_digits=9)),
                ('pickup_lng', models.DecimalField(decimal_places=6, max_digits=9)),
                ('pickup_notes', models.TextField(blank=True)),
                ('delivery_name', models.CharField(max_length=200)),
                ('delivery_phone', models.CharField(max_length=20)),
                ('delivery_address', models.TextField()),
                ('delivery_city', models.CharField(max_length=100)),
                ('delivery_lat', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('delivery_lng', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('delivery_notes', models.TextField(blank=True)),
                ('package_description', models.TextField()),
                ('package_weight', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('package_dimensions', models.JSONField(blank=True, default=dict)),
                ('fragile', models.BooleanField(default=False)),
                ('perishable', models.BooleanField(default=False)),
                ('delivery_category', models.CharField(max_length=50)),
                ('priority', models.CharField(choices=[('standard', 'Standard'), ('express', 'Express'), ('urgent', 'Urgent')], default='standard', max_length=20)),
                ('estimated_distance', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('estimated_duration', models.IntegerField(blank=True, null=True)),
                ('delivery_fee', models.DecimalField(decimal_places=2, max_digits=10)),
                ('platform_fee', models.DecimalField(decimal_places=2, max_digits=10)),
                ('courier_earnings', models.DecimalField(decimal_places=2, max_digits=10)),
                ('tip_amount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('total_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('payment_method', models.CharField(choices=[('card', 'Credit/Debit Card'), ('mobile_money', 'Mobile Money'), ('cash', 'Cash on Delivery')], max_length=20)),
                ('payment_status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed'), ('refunded', 'Refunded')], default='pending', max_length=20)),
                ('stripe_payment_intent_id', models.CharField(blank=True, max_length=200)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('courier_assigned', 'Courier Assigned'), ('courier_confirmed', 'Courier Confirmed'), ('picked', 'Picked Up'), ('in_transit', 'In Transit'), ('delivered', 'Delivered'), ('cancelled', 'Cancelled'), ('failed', 'Failed')], default='pending', max_length=30)),
                ('verification_code', models.CharField(blank=True, max_length=10)),
                ('courier_notes', models.TextField(blank=True)),
                ('customer_rating', models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('customer_review', models.TextField(blank=True)),
                ('courier_rating', models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('business_rating', models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('assigned_at', models.DateTimeField(blank=True, null=True)),
                ('picked_at', models.DateTimeField(blank=True, null=True)),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('cancelled_at', models.DateTimeField(blank=True, null=True)),
                ('cancellation_reason', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('courier', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='deliveries', to='couriers.courierprofile')),
                ('requested_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='delivery_requests', to=settings.AUTH_USER_MODEL)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
            ],
            options={
                'db_table': 'couriers_deliveryorder',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='CourierEarnings',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('period_start', models.DateField()),
                ('period_end', models.DateField()),
                ('total_deliveries', models.IntegerField(default=0)),
                ('total_distance', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('base_earnings', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('tips', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('bonuses', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('deductions', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('net_earnings', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('payout_method', models.CharField(choices=[('bank_transfer', 'Bank Transfer'), ('mobile_money', 'Mobile Money'), ('cash', 'Cash Pickup')], max_length=20)),
                ('payout_status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('payout_date', models.DateTimeField(blank=True, null=True)),
                ('payout_reference', models.CharField(blank=True, max_length=200)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('courier', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='earnings', to='couriers.courierprofile')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
            ],
            options={
                'db_table': 'couriers_courierearnings',
                'ordering': ['-period_start'],
            },
        ),
    ]