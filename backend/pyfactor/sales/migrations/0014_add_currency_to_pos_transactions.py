# Generated migration to add currency fields to POS transactions

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0013_remove_customer_loyalty_program_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='postransaction',
            name='currency_code',
            field=models.CharField(max_length=3, default='USD', help_text='ISO 4217 currency code'),
        ),
        migrations.AddField(
            model_name='postransaction',
            name='currency_symbol',
            field=models.CharField(max_length=10, default='$', help_text='Currency symbol for display'),
        ),
    ]