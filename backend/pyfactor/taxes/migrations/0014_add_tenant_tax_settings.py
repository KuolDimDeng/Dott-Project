# Generated manually for tenant-specific tax settings
from django.db import migrations, models
import django.db.models.deletion
import django_countries.fields
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('taxes', '0013_add_missing_fields_to_globalsalestaxrate'),
    ]

    operations = [
        migrations.CreateModel(
            name='TenantTaxSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.CharField(db_index=True, max_length=255)),
                ('sales_tax_enabled', models.BooleanField(default=True)),
                ('sales_tax_rate', models.DecimalField(decimal_places=4, help_text='Tax rate as decimal (e.g., 0.0875 for 8.75%)', max_digits=6)),
                ('sales_tax_type', models.CharField(choices=[('sales_tax', 'Sales Tax'), ('vat', 'VAT'), ('gst', 'GST'), ('consumption_tax', 'Consumption Tax'), ('none', 'No Tax')], default='sales_tax', max_length=20)),
                ('country', django_countries.fields.CountryField(max_length=2)),
                ('region_code', models.CharField(blank=True, max_length=10)),
                ('region_name', models.CharField(blank=True, max_length=100)),
                ('is_custom_rate', models.BooleanField(default=True, help_text='Whether this is a custom rate (True) or copied from global (False)')),
                ('original_global_rate', models.DecimalField(blank=True, decimal_places=4, help_text='The global rate at time of override', max_digits=6, null=True)),
                ('tax_inclusive_pricing', models.BooleanField(default=False, help_text='Whether prices include tax')),
                ('show_tax_on_receipts', models.BooleanField(default=True)),
                ('tax_registration_number', models.CharField(blank=True, help_text='VAT/GST/Tax registration number', max_length=100)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='tax_settings_created', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='tax_settings_updated', to=settings.AUTH_USER_MODEL)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tax_settings', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Tenant Tax Settings',
                'verbose_name_plural': 'Tenant Tax Settings',
                'indexes': [
                    models.Index(fields=['tenant_id', 'country'], name='taxes_tenan_tenant__e9c2f9_idx'),
                ],
            },
        ),
        migrations.AlterUniqueTogether(
            name='tenanttaxsettings',
            unique_together={('tenant_id', 'country', 'region_code')},
        ),
    ]