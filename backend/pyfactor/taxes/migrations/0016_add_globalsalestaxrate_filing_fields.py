# Generated migration for GlobalSalesTaxRate filing fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('taxes', '0015_add_filing_service_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='tax_authority_name',
            field=models.CharField(blank=True, help_text='Name of the tax authority (e.g., Kenya Revenue Authority)', max_length=200),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='filing_frequency',
            field=models.CharField(blank=True, choices=[('monthly', 'Monthly'), ('quarterly', 'Quarterly'), ('annual', 'Annual'), ('bi_monthly', 'Bi-Monthly'), ('transaction', 'Per Transaction')], help_text='How often tax returns must be filed', max_length=20),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='filing_day_of_month',
            field=models.IntegerField(blank=True, help_text='Day of month when filing is due (e.g., 20)', null=True),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='online_filing_available',
            field=models.BooleanField(default=False, help_text='Whether online filing is available through government portal'),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='online_portal_name',
            field=models.CharField(blank=True, help_text='Name of online filing portal (e.g., iTax, HMRC)', max_length=100),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='online_portal_url',
            field=models.URLField(blank=True, help_text='URL of online filing portal', max_length=500),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='main_form_name',
            field=models.CharField(blank=True, help_text='Main tax form name (e.g., VAT3, Form ST-1)', max_length=100),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='filing_instructions',
            field=models.TextField(blank=True, help_text='Basic instructions for manual filing'),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='manual_filing_fee',
            field=models.DecimalField(decimal_places=2, default=35.0, help_text='Fee for manual filing service (USD)', max_digits=6),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='online_filing_fee',
            field=models.DecimalField(decimal_places=2, default=65.0, help_text='Fee for online filing service (USD)', max_digits=6),
        ),
    ]