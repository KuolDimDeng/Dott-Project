# Generated migration for pricing model fields

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0010_add_structured_address_to_location'),
    ]

    operations = [
        # Add pricing model field to Product
        migrations.AddField(
            model_name='product',
            name='pricing_model',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('direct', 'Direct (One-time price)'),
                    ('time_weight', 'Time & Weight (Price × Days × Weight)'),
                    ('time_only', 'Time Only (Price × Days)'),
                    ('weight_only', 'Weight Only (Price × Weight)'),
                ],
                default='direct',
                help_text='How this product is priced'
            ),
        ),
        
        # Add weight field for weight-based pricing
        migrations.AddField(
            model_name='product',
            name='weight',
            field=models.DecimalField(
                max_digits=10,
                decimal_places=2,
                blank=True,
                null=True,
                help_text='Weight of the item (for weight-based pricing)'
            ),
        ),
        
        # Add weight unit field
        migrations.AddField(
            model_name='product',
            name='weight_unit',
            field=models.CharField(
                max_length=10,
                default='kg',
                blank=True,
                help_text='Unit of weight (kg, lbs, etc.)'
            ),
        ),
        
        # Add daily rate for time-based pricing
        migrations.AddField(
            model_name='product',
            name='daily_rate',
            field=models.DecimalField(
                max_digits=10,
                decimal_places=2,
                blank=True,
                null=True,
                help_text='Rate per day (for time-based pricing)'
            ),
        ),
        
        # Add entry date for time calculations
        migrations.AddField(
            model_name='product',
            name='entry_date',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='When item entered storage (for time calculations)'
            ),
        ),
        
        # Add index for pricing model field for better query performance
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['pricing_model'], name='inventory_p_pricing_7e4a2f_idx'),
        ),
    ]