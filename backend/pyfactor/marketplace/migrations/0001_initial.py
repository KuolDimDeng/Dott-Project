from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid

class Migration(migrations.Migration):
    initial = True
    
    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]
    
    operations = [
        migrations.CreateModel(
            name='BusinessListing',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('business', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='marketplace_listing', to='auth.user')),
                ('primary_category', models.CharField(max_length=50)),
                ('secondary_categories', models.JSONField(blank=True, default=list)),
                ('delivery_scope', models.CharField(default='local', max_length=20)),
                ('delivery_radius_km', models.DecimalField(decimal_places=2, default=10.0, max_digits=5)),
                ('ships_to_countries', models.JSONField(blank=True, default=list)),
                ('is_digital_only', models.BooleanField(default=False)),
                ('country', models.CharField(blank=True, max_length=2)),
                ('city', models.CharField(blank=True, max_length=100)),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('is_visible_in_marketplace', models.BooleanField(default=True)),
                ('is_verified', models.BooleanField(default=False)),
                ('is_featured', models.BooleanField(default=False)),
                ('business_hours', models.JSONField(blank=True, default=dict)),
                ('search_tags', models.JSONField(blank=True, default=list)),
                ('description', models.TextField(blank=True)),
                ('average_rating', models.DecimalField(decimal_places=2, default=0.0, max_digits=3)),
                ('total_reviews', models.IntegerField(default=0)),
                ('total_orders', models.IntegerField(default=0)),
                ('average_response_time', models.IntegerField(blank=True, null=True)),
                ('response_rate', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_active', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'db_table': 'marketplace_business_listing',
            },
        ),
        migrations.CreateModel(
            name='ConsumerProfile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='consumer_profile', to='auth.user')),
                ('default_delivery_address', models.TextField(blank=True)),
                ('delivery_addresses', models.JSONField(blank=True, default=list)),
                ('current_latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('current_longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('current_city', models.CharField(blank=True, max_length=100)),
                ('current_country', models.CharField(blank=True, max_length=2)),
                ('preferred_categories', models.JSONField(blank=True, default=list)),
                ('recent_searches', models.JSONField(blank=True, default=list)),
                ('total_orders', models.IntegerField(default=0)),
                ('total_spent', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('average_order_value', models.DecimalField(decimal_places=2, default=0.0, max_digits=10)),
                ('consumer_rating', models.DecimalField(decimal_places=2, default=5.0, max_digits=3)),
                ('total_ratings_received', models.IntegerField(default=0)),
                ('preferred_payment_method', models.CharField(blank=True, max_length=50)),
                ('notification_preferences', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_order_at', models.DateTimeField(blank=True, null=True)),
                ('favorite_businesses', models.ManyToManyField(blank=True, related_name='favorited_by', to='marketplace.businesslisting')),
            ],
            options={
                'db_table': 'marketplace_consumer_profile',
            },
        ),
        migrations.CreateModel(
            name='BusinessSearch',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('consumer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='searches', to='auth.user')),
                ('search_query', models.CharField(blank=True, max_length=255)),
                ('category_filter', models.CharField(blank=True, max_length=50)),
                ('location_filter', models.CharField(blank=True, max_length=255)),
                ('consumer_country', models.CharField(blank=True, max_length=2)),
                ('consumer_city', models.CharField(blank=True, max_length=100)),
                ('consumer_latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('consumer_longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('results_count', models.IntegerField(default=0)),
                ('clicked_results', models.JSONField(blank=True, default=list)),
                ('resulted_in_order', models.BooleanField(default=False)),
                ('order_id', models.UUIDField(blank=True, null=True)),
                ('searched_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('device_type', models.CharField(blank=True, max_length=50)),
            ],
            options={
                'db_table': 'marketplace_business_search',
            },
        ),
    ]