# Generated migration to add county-level filing fields to GlobalSalesTaxRate

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('taxes', '0021_add_sales_tax_jurisdiction_override'),
    ]

    operations = [
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='county_filing_website',
            field=models.URLField(blank=True, help_text='County-specific filing website (if different from state)', max_length=500),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='county_contact_phone',
            field=models.CharField(blank=True, help_text='County tax office phone number', max_length=20),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='county_contact_email',
            field=models.EmailField(blank=True, help_text='County tax office email', max_length=254),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='county_mailing_address',
            field=models.TextField(blank=True, help_text='Physical address for mailing tax returns'),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='county_filing_instructions',
            field=models.TextField(blank=True, help_text='County-specific filing instructions and requirements'),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='county_filing_frequency',
            field=models.CharField(blank=True, choices=[('', 'Same as State'), ('monthly', 'Monthly'), ('quarterly', 'Quarterly'), ('annual', 'Annual'), ('bi_monthly', 'Bi-Monthly')], default='', help_text='County filing frequency (if different from state)', max_length=20),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='county_filing_deadline',
            field=models.CharField(blank=True, help_text='County filing deadline (e.g., \'20th of following month\')', max_length=50),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='county_online_portal_available',
            field=models.BooleanField(default=False, help_text='Whether county has its own online filing portal'),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='county_online_portal_name',
            field=models.CharField(blank=True, help_text='Name of county online portal (if available)', max_length=100),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='county_online_portal_url',
            field=models.URLField(blank=True, help_text='URL of county online filing portal', max_length=500),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='county_special_requirements',
            field=models.TextField(blank=True, help_text='Special county-specific requirements (permits, registrations, etc.)'),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='county_payment_methods',
            field=models.JSONField(blank=True, default=list, help_text='Accepted payment methods [\'check\', \'online\', \'ach\', \'wire\']'),
        ),
    ]