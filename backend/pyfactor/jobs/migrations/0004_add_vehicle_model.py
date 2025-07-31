# Generated migration for Vehicle model

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        ('hr', '0001_initial'),
        ('jobs', '0003_add_job_workflow_models'),
    ]

    operations = [
        migrations.CreateModel(
            name='Vehicle',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('registration_number', models.CharField(max_length=50)),
                ('vehicle_type', models.CharField(choices=[('car', 'Car'), ('van', 'Van'), ('truck', 'Truck'), ('pickup', 'Pickup Truck'), ('suv', 'SUV'), ('trailer', 'Trailer'), ('equipment', 'Heavy Equipment'), ('other', 'Other')], default='van', max_length=20)),
                ('make', models.CharField(max_length=100)),
                ('model', models.CharField(max_length=100)),
                ('year', models.IntegerField()),
                ('color', models.CharField(blank=True, max_length=50, null=True)),
                ('vin', models.CharField(blank=True, max_length=50, null=True)),
                ('fuel_type', models.CharField(choices=[('gasoline', 'Gasoline'), ('diesel', 'Diesel'), ('electric', 'Electric'), ('hybrid', 'Hybrid'), ('natural_gas', 'Natural Gas'), ('other', 'Other')], default='gasoline', max_length=20)),
                ('mileage', models.IntegerField(default=0)),
                ('license_plate', models.CharField(blank=True, max_length=50, null=True)),
                ('status', models.CharField(choices=[('active', 'Active'), ('maintenance', 'Under Maintenance'), ('repair', 'Under Repair'), ('inactive', 'Inactive'), ('retired', 'Retired')], default='active', max_length=20)),
                ('is_available', models.BooleanField(default=True)),
                ('purchase_date', models.DateField(blank=True, null=True)),
                ('purchase_price', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('insurance_policy', models.CharField(blank=True, max_length=100, null=True)),
                ('insurance_expiry', models.DateField(blank=True, null=True)),
                ('last_service_date', models.DateField(blank=True, null=True)),
                ('next_service_date', models.DateField(blank=True, null=True)),
                ('service_interval_miles', models.IntegerField(default=5000)),
                ('notes', models.TextField(blank=True, null=True)),
                ('photo', models.ImageField(blank=True, null=True, upload_to='vehicles/')),
                ('assigned_to', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_vehicles', to='hr.employee')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='vehicles_created', to='users.user')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='users.businessprofile')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='vehicles_updated', to='users.user')),
            ],
            options={
                'db_table': 'jobs_vehicle',
                'ordering': ['registration_number'],
            },
        ),
        migrations.AddConstraint(
            model_name='vehicle',
            constraint=models.UniqueConstraint(fields=('registration_number', 'tenant'), name='unique_vehicle_registration_per_tenant'),
        ),
        migrations.AddField(
            model_name='job',
            name='vehicle',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='jobs', to='jobs.vehicle'),
        ),
    ]