# Generated migration for adding currency exchange rate fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0002_auto_20240101_0000'),  # Update this to your latest migration
    ]

    operations = [
        # Add exchange rate fields to Invoice
        migrations.AddField(
            model_name='invoice',
            name='exchange_rate',
            field=models.DecimalField(
                blank=True, 
                decimal_places=6, 
                help_text='Exchange rate to USD at creation time', 
                max_digits=12, 
                null=True
            ),
        ),
        migrations.AddField(
            model_name='invoice',
            name='exchange_rate_date',
            field=models.DateTimeField(
                blank=True, 
                help_text='When exchange rate was captured', 
                null=True
            ),
        ),
        migrations.AddField(
            model_name='invoice',
            name='currency_locked',
            field=models.BooleanField(
                default=False, 
                help_text='Currency is locked once invoice is sent or paid'
            ),
        ),
        
        # Add exchange rate fields to Estimate
        migrations.AddField(
            model_name='estimate',
            name='exchange_rate',
            field=models.DecimalField(
                blank=True, 
                decimal_places=6, 
                help_text='Exchange rate to USD at creation time', 
                max_digits=12, 
                null=True
            ),
        ),
        migrations.AddField(
            model_name='estimate',
            name='exchange_rate_date',
            field=models.DateTimeField(
                blank=True, 
                help_text='When exchange rate was captured', 
                null=True
            ),
        ),
        migrations.AddField(
            model_name='estimate',
            name='currency_locked',
            field=models.BooleanField(
                default=False, 
                help_text='Currency is locked once estimate is accepted'
            ),
        ),
    ]