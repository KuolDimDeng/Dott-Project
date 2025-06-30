# Generated migration for e-filing fields

from django.db import migrations, models
import django.core.validators
from django.contrib.postgres.fields import JSONField


class Migration(migrations.Migration):

    dependencies = [
        ('taxes', '0006_taxreminder_taxfilinglocation'),
    ]

    operations = [
        migrations.AddField(
            model_name='state',
            name='e_file_api_base_url',
            field=models.URLField(blank=True, help_text="Base URL for state's e-filing API", null=True),
        ),
        migrations.AddField(
            model_name='state',
            name='e_file_api_version',
            field=models.CharField(default='v1', help_text='API version for e-filing', max_length=20),
        ),
        migrations.AddField(
            model_name='state',
            name='e_file_formats',
            field=models.CharField(default='XML', help_text='Supported e-file formats (comma-separated)', max_length=100),
        ),
        migrations.AddField(
            model_name='state',
            name='base_tax_rate',
            field=models.DecimalField(decimal_places=4, default=0, help_text='Base state sales tax rate', max_digits=6, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(1)]),
        ),
        migrations.AddField(
            model_name='state',
            name='filing_frequency_thresholds',
            field=JSONField(blank=True, default=dict, help_text='Revenue thresholds for filing frequency'),
        ),
        migrations.AddField(
            model_name='state',
            name='form_number',
            field=models.CharField(blank=True, help_text='Primary sales tax form number', max_length=50),
        ),
        migrations.AddField(
            model_name='state',
            name='form_name',
            field=models.CharField(blank=True, help_text='Primary sales tax form name', max_length=200),
        ),
        migrations.AddField(
            model_name='state',
            name='filing_due_day',
            field=models.IntegerField(default=20, help_text='Day of month when filing is due', validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(31)]),
        ),
        migrations.AddField(
            model_name='state',
            name='vendor_discount_rate',
            field=models.DecimalField(decimal_places=4, default=0, help_text='Discount rate for timely filing', max_digits=6, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(0.1)]),
        ),
        migrations.AddField(
            model_name='state',
            name='has_district_taxes',
            field=models.BooleanField(default=False, help_text='State has special district taxes'),
        ),
        migrations.AddField(
            model_name='state',
            name='has_home_rule_cities',
            field=models.BooleanField(default=False, help_text='State has cities that collect their own tax'),
        ),
        migrations.AddField(
            model_name='state',
            name='requires_location_reporting',
            field=models.BooleanField(default=False, help_text='Requires separate reporting by location'),
        ),
    ]