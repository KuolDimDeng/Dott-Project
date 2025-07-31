# Generated migration for inventory valuation method field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0024_add_accounting_standard'),
    ]

    operations = [
        migrations.AddField(
            model_name='businessdetails',
            name='inventory_valuation_method',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('FIFO', 'First In, First Out (FIFO)'),
                    ('LIFO', 'Last In, First Out (LIFO)'),
                    ('WEIGHTED_AVERAGE', 'Weighted Average'),
                ],
                default='WEIGHTED_AVERAGE',
                help_text='Inventory valuation method (LIFO only available for US GAAP)'
            ),
        ),
    ]