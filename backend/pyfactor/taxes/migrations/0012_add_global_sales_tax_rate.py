# Generated manually
from django.db import migrations, models
import django_countries.fields


class Migration(migrations.Migration):

    dependencies = [
        ('taxes', '0011_add_tax_suggestion_feedback'),
    ]

    operations = [
        migrations.CreateModel(
            name='GlobalSalesTaxRate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('country', django_countries.fields.CountryField(db_index=True, max_length=2)),
                ('country_name', models.CharField(max_length=100)),
                ('region_code', models.CharField(blank=True, db_index=True, max_length=10)),
                ('region_name', models.CharField(blank=True, max_length=100)),
                ('locality', models.CharField(blank=True, db_index=True, max_length=100)),
                ('tax_type', models.CharField(choices=[('sales_tax', 'Sales Tax'), ('vat', 'VAT'), ('gst', 'GST'), ('consumption_tax', 'Consumption Tax'), ('none', 'No Tax')], max_length=20)),
                ('rate', models.DecimalField(decimal_places=4, help_text='Tax rate as decimal (e.g., 0.0875 for 8.75%)', max_digits=6)),
                ('effective_date', models.DateField(help_text='Date when this rate became effective')),
                ('end_date', models.DateField(blank=True, help_text='Date when this rate ended (null if current)', null=True)),
                ('is_current', models.BooleanField(db_index=True, default=True, help_text='Whether this is the current active rate')),
                ('ai_populated', models.BooleanField(default=True, help_text='Whether this rate was populated by AI')),
                ('ai_confidence_score', models.DecimalField(blank=True, decimal_places=2, help_text='AI confidence score (0-1)', max_digits=3, null=True)),
                ('ai_source_notes', models.TextField(blank=True, help_text='Notes from AI about the source/accuracy of this rate')),
                ('ai_last_verified', models.DateTimeField(blank=True, help_text='Last time AI verified this rate', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Global Sales Tax Rate',
                'verbose_name_plural': 'Global Sales Tax Rates',
                'ordering': ['country', 'region_code', 'locality', '-effective_date'],
                'indexes': [
                    models.Index(fields=['country', 'is_current'], name='taxes_globa_country_f1b5c6_idx'),
                    models.Index(fields=['country', 'region_code', 'locality', 'is_current'], name='taxes_globa_country_7f4d8e_idx'),
                    models.Index(fields=['tax_type', 'is_current'], name='taxes_globa_tax_typ_9c2a1f_idx'),
                ],
            },
        ),
    ]