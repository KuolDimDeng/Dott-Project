# Generated migration for filing service fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('taxes', '0014_add_tenant_tax_settings'),
    ]

    operations = [
        migrations.AddField(
            model_name='taxfiling',
            name='region_code',
            field=models.CharField(blank=True, help_text='Region/State code for sub-national filings (e.g., CA for California)', max_length=10),
        ),
        migrations.AddField(
            model_name='taxfiling',
            name='filing_fee',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Filing service fee charged', max_digits=10),
        ),
        migrations.AddField(
            model_name='taxfiling',
            name='special_instructions',
            field=models.TextField(blank=True, help_text='Special instructions from the user'),
        ),
        migrations.AddField(
            model_name='taxfiling',
            name='total_sales',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Total sales for the period', max_digits=15),
        ),
        migrations.AddField(
            model_name='taxfiling',
            name='taxable_sales',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Taxable sales for the period', max_digits=15),
        ),
        migrations.AddField(
            model_name='taxfiling',
            name='tax_collected',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Tax collected for the period', max_digits=15),
        ),
        migrations.AddField(
            model_name='taxfiling',
            name='tax_rate',
            field=models.DecimalField(decimal_places=4, default=0, help_text='Applied tax rate', max_digits=5),
        ),
    ]