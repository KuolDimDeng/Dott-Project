# Generated migration for GlobalSalesTaxRate model

from django.db import migrations, models
import django.core.validators
import django_countries.fields
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('taxes', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='GlobalSalesTaxRate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('country', django_countries.fields.CountryField(db_index=True, max_length=2)),
                ('country_name', models.CharField(max_length=100)),
                ('region_code', models.CharField(blank=True, help_text='State/Province code', max_length=10)),
                ('region_name', models.CharField(blank=True, help_text='State/Province name', max_length=100)),
                ('locality', models.CharField(blank=True, help_text='City/County', max_length=100)),
                ('tax_type', models.CharField(choices=[('sales_tax', 'Sales Tax'), ('vat', 'VAT'), ('gst', 'GST'), ('hst', 'HST'), ('pst', 'PST'), ('qst', 'QST'), ('consumption_tax', 'Consumption Tax'), ('service_tax', 'Service Tax')], max_length=20)),
                ('rate', models.DecimalField(decimal_places=4, help_text='Tax rate as decimal (0.075 = 7.5%)', max_digits=6, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(1)])),
                ('ai_populated', models.BooleanField(default=True)),
                ('ai_confidence_score', models.DecimalField(blank=True, decimal_places=2, help_text='AI confidence in this rate (0-1)', max_digits=3, null=True)),
                ('ai_source_notes', models.TextField(blank=True, help_text='Where AI found this information')),
                ('ai_last_verified', models.DateTimeField(default=django.utils.timezone.now)),
                ('effective_date', models.DateField(default=django.utils.timezone.now)),
                ('is_current', models.BooleanField(default=True)),
                ('manually_verified', models.BooleanField(default=False)),
                ('manual_notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'indexes': [
                    models.Index(fields=['country', 'is_current'], name='taxes_globa_country_6a6d8f_idx'),
                    models.Index(fields=['country', 'region_code', 'is_current'], name='taxes_globa_country_9e7c45_idx'),
                ],
            },
        ),
        migrations.AddConstraint(
            model_name='globalsalestaxrate',
            constraint=models.UniqueConstraint(fields=('country', 'region_code', 'locality', 'tax_type', 'effective_date'), name='unique_tax_rate_location'),
        ),
    ]