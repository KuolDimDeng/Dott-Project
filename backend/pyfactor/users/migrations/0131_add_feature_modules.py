# Generated migration for feature modules

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0130_add_location_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='FeatureModule',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('code', models.CharField(help_text="Unique identifier like 'payroll', 'analytics'", max_length=50, unique=True)),
                ('name', models.CharField(help_text="Display name like 'Payroll & HR'", max_length=100)),
                ('description', models.TextField(help_text='Description of what this module includes')),
                ('category', models.CharField(help_text="Category like 'hr', 'analytics', 'operations'", max_length=50)),
                ('monthly_price', models.DecimalField(decimal_places=2, help_text='Monthly price in USD', max_digits=10)),
                ('developing_country_price', models.DecimalField(decimal_places=2, help_text='Discounted price for developing countries', max_digits=10)),
                ('is_active', models.BooleanField(default=True, help_text='Whether this module is available for purchase')),
                ('is_core', models.BooleanField(default=False, help_text='Core features are always free')),
                ('required_features', models.JSONField(blank=True, default=list, help_text='List of feature codes that must be enabled first')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'users_feature_modules',
                'indexes': [
                    models.Index(fields=['code'], name='users_featu_code_idx'),
                    models.Index(fields=['is_active'], name='users_featu_active_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='BusinessFeatureModule',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('enabled', models.BooleanField(default=True)),
                ('added_at', models.DateTimeField(auto_now_add=True)),
                ('removed_at', models.DateTimeField(blank=True, null=True)),
                ('next_bill_date', models.DateTimeField(blank=True, null=True)),
                ('last_billed', models.DateTimeField(blank=True, null=True)),
                ('billing_active', models.BooleanField(default=False, help_text='False during testing mode')),
                ('business', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='feature_modules', to='users.business')),
                ('feature_module', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='users.featuremodule')),
            ],
            options={
                'db_table': 'users_business_feature_modules',
                'unique_together': {('business', 'feature_module')},
                'indexes': [
                    models.Index(fields=['business', 'enabled'], name='users_busfe_bus_ena_idx'),
                    models.Index(fields=['feature_module', 'enabled'], name='users_busfe_fea_ena_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='FeatureBillingEvent',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('event_type', models.CharField(choices=[('added', 'Added'), ('removed', 'Removed')], max_length=20)),
                ('event_date', models.DateTimeField(auto_now_add=True)),
                ('prorated_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('days_remaining', models.IntegerField()),
                ('days_in_period', models.IntegerField()),
                ('charged', models.BooleanField(default=False, help_text='False during testing mode')),
                ('stripe_charge_id', models.CharField(blank=True, max_length=255, null=True)),
                ('business', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='feature_billing_events', to='users.business')),
                ('feature_module', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='users.featuremodule')),
            ],
            options={
                'db_table': 'users_feature_billing_events',
                'indexes': [
                    models.Index(fields=['business', 'event_date'], name='users_febil_bus_eve_idx'),
                    models.Index(fields=['charged'], name='users_febil_charged_idx'),
                ],
            },
        ),
    ]