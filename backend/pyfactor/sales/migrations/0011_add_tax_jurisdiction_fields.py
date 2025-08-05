# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0010_populate_invoice_currency_from_business'),
    ]

    operations = [
        migrations.AddField(
            model_name='postransaction',
            name='tax_jurisdiction',
            field=models.JSONField(
                default=dict,
                blank=True,
                help_text='Store all tax jurisdiction components and rates'
            ),
        ),
        migrations.AddField(
            model_name='postransaction',
            name='tax_calculation_method',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('destination', 'Customer Shipping Address'),
                    ('billing', 'Customer Billing Address'),
                    ('origin', 'Business Location'),
                    ('manual', 'Manually Entered'),
                    ('exempt', 'Tax Exempt'),
                ],
                default='origin',
                help_text='Method used to calculate tax'
            ),
        ),
        migrations.AddField(
            model_name='postransaction',
            name='shipping_address_used',
            field=models.BooleanField(
                default=False,
                help_text='Whether shipping address was used for tax calculation'
            ),
        ),
    ]