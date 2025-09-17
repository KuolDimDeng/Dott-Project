# Generated migration for featuring fields in Product model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0002_add_supply_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='is_featured',
            field=models.BooleanField(default=False, help_text='Show as featured product in marketplace'),
        ),
        migrations.AddField(
            model_name='product',
            name='featured_until',
            field=models.DateTimeField(blank=True, help_text='When featured status expires', null=True),
        ),
        migrations.AddField(
            model_name='product',
            name='featured_priority',
            field=models.IntegerField(default=0, help_text='Higher priority items show first'),
        ),
        migrations.AddField(
            model_name='product',
            name='featured_score',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Calculated score for automatic featuring', max_digits=5),
        ),
        migrations.AddField(
            model_name='product',
            name='view_count',
            field=models.IntegerField(default=0, help_text='Number of times viewed in marketplace'),
        ),
        migrations.AddField(
            model_name='product',
            name='order_count',
            field=models.IntegerField(default=0, help_text='Number of times ordered'),
        ),
    ]