# Generated migration for SalesTaxJurisdictionOverride model

from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import django_countries.fields


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('taxes', '0020_add_locality_to_tenant_settings'),
    ]

    operations = [
        migrations.CreateModel(
            name='SalesTaxJurisdictionOverride',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.CharField(db_index=True, max_length=255)),
                ('country', django_countries.fields.CountryField(max_length=2)),
                ('region_code', models.CharField(blank=True, help_text='State/Province code', max_length=10)),
                ('region_name', models.CharField(blank=True, help_text='State/Province name', max_length=100)),
                ('locality', models.CharField(blank=True, help_text='County/City code', max_length=100)),
                ('locality_name', models.CharField(blank=True, help_text='County/City name', max_length=200)),
                ('country_rate', models.DecimalField(decimal_places=4, default=0.0000, help_text='Country-level tax rate (usually 0 for US)', max_digits=6, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(1)])),
                ('state_rate', models.DecimalField(decimal_places=4, default=0.0000, help_text='State/Province tax rate', max_digits=6, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(1)])),
                ('county_rate', models.DecimalField(decimal_places=4, default=0.0000, help_text='County/Local tax rate', max_digits=6, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(1)])),
                ('total_rate', models.DecimalField(decimal_places=4, help_text='Total combined tax rate', max_digits=6, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(1)])),
                ('override_reason', models.TextField(help_text='Reason for overriding the global rate (required for audit)')),
                ('original_global_rates', models.JSONField(default=dict, help_text='Original rates from GlobalSalesTaxRate at time of override')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tax_overrides', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='tax_override_updates', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Sales Tax Jurisdiction Override',
                'verbose_name_plural': 'Sales Tax Jurisdiction Overrides',
                'indexes': [
                    models.Index(fields=['tenant_id', 'country', 'region_code'], name='taxes_salestaxjurisdictionoverride_tenant_country_region_idx'),
                    models.Index(fields=['tenant_id', 'is_active'], name='taxes_salestaxjurisdictionoverride_tenant_active_idx'),
                ],
                'unique_together': {('tenant_id', 'country', 'region_code', 'locality')},
            },
        ),
    ]