# Generated migration to add additional fields to TaxRateCache

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('taxes', '0009_add_payroll_tax_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='taxratecache',
            name='local_sales_tax_rate',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name='taxratecache',
            name='total_sales_tax_rate',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name='taxratecache',
            name='corporate_income_tax_rate',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name='taxratecache',
            name='has_progressive_tax',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='taxratecache',
            name='personal_income_tax_brackets',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='taxratecache',
            name='health_insurance_rate',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name='taxratecache',
            name='health_insurance_employer_rate',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name='taxratecache',
            name='social_security_rate',
            field=models.DecimalField(decimal_places=2, default=6.2, max_digits=5),
        ),
        migrations.AddField(
            model_name='taxratecache',
            name='social_security_employer_rate',
            field=models.DecimalField(decimal_places=2, default=6.2, max_digits=5),
        ),
        migrations.AddField(
            model_name='taxratecache',
            name='state_payroll_tax_rate',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name='taxratecache',
            name='local_tax_website',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name='taxratecache',
            name='local_tax_address',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='taxratecache',
            name='filing_deadlines',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]