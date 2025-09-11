# Generated migration for advertising app

from django.db import migrations, models
import django.db.models.deletion
import uuid
from decimal import Decimal


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0131_add_feature_modules'),
    ]

    operations = [
        migrations.CreateModel(
            name='AdvertisingCampaign',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('type', models.CharField(choices=[('featured', 'Featured Listing'), ('banner', 'Banner Ad'), ('spotlight', 'Spotlight'), ('premium', 'Premium Package')], default='featured', max_length=20)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('pending_payment', 'Pending Payment'), ('active', 'Active'), ('paused', 'Paused'), ('completed', 'Completed'), ('cancelled', 'Cancelled')], default='draft', max_length=20)),
                ('total_budget', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('daily_budget', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('spent_amount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('platforms', models.JSONField(default=list)),
                ('target_location', models.CharField(choices=[('local', 'Local (City)'), ('national', 'National'), ('international', 'International')], default='local', max_length=20)),
                ('target_audience', models.CharField(default='all', max_length=50)),
                ('target_keywords', models.JSONField(blank=True, default=list)),
                ('image_url', models.URLField(blank=True, max_length=500, null=True)),
                ('cloudinary_public_id', models.CharField(blank=True, max_length=255, null=True)),
                ('banner_text', models.CharField(blank=True, max_length=255)),
                ('call_to_action', models.CharField(default='Learn More', max_length=50)),
                ('landing_url', models.URLField(blank=True, max_length=500, null=True)),
                ('impressions', models.IntegerField(default=0)),
                ('clicks', models.IntegerField(default=0)),
                ('conversions', models.IntegerField(default=0)),
                ('ctr', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=5)),
                ('conversion_rate', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=5)),
                ('payment_status', models.CharField(choices=[('pending', 'Pending'), ('paid', 'Paid'), ('failed', 'Failed'), ('refunded', 'Refunded')], default='pending', max_length=20)),
                ('payment_method', models.CharField(blank=True, max_length=50, null=True)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('activated_at', models.DateTimeField(blank=True, null=True)),
                ('paused_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('business', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='advertising_campaigns', to='users.business')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_campaigns', to='custom_auth.user')),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['business', 'status'], name='advertising_bus_sta_idx'),
                    models.Index(fields=['start_date', 'end_date'], name='advertising_dates_idx'),
                    models.Index(fields=['type', 'status'], name='advertising_typ_sta_idx'),
                ],
            },
        ),
        # Add other models if needed
    ]