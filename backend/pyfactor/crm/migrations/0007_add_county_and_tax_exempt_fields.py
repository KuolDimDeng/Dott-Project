# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0006_customer_tenant_id_and_more'),
    ]

    operations = [
        # Add county fields
        migrations.AddField(
            model_name='customer',
            name='billing_county',
            field=models.CharField(blank=True, max_length=100, null=True, help_text='County for billing address'),
        ),
        migrations.AddField(
            model_name='customer',
            name='shipping_county',
            field=models.CharField(blank=True, max_length=100, null=True, help_text='County for shipping address'),
        ),
        # Add separate shipping address fields
        migrations.AddField(
            model_name='customer',
            name='shipping_street',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='customer',
            name='shipping_city',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='customer',
            name='shipping_postcode',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        # Add tax exemption fields
        migrations.AddField(
            model_name='customer',
            name='is_tax_exempt',
            field=models.BooleanField(default=False, help_text='Customer is exempt from sales tax'),
        ),
        migrations.AddField(
            model_name='customer',
            name='tax_exempt_certificate',
            field=models.CharField(blank=True, max_length=100, null=True, help_text='Tax exemption certificate number'),
        ),
        migrations.AddField(
            model_name='customer',
            name='tax_exempt_expiry',
            field=models.DateField(blank=True, null=True, help_text='Tax exemption expiry date'),
        ),
    ]