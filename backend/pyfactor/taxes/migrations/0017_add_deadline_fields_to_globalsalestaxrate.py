# Generated migration for GlobalSalesTaxRate deadline fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('taxes', '0016_add_globalsalestaxrate_filing_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='filing_deadline_days',
            field=models.IntegerField(blank=True, help_text='Number of days after period end when filing is due', null=True),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='filing_deadline_description',
            field=models.TextField(blank=True, help_text='Text description of deadline rules (e.g., "Due by 15th of following month")'),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='grace_period_days',
            field=models.IntegerField(blank=True, default=0, help_text='Additional days allowed after deadline before penalties'),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='penalty_rate',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Late filing penalty percentage per month', max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name='globalsalestaxrate',
            name='deadline_notes',
            field=models.TextField(blank=True, help_text='Special deadline rules, holiday adjustments, or exceptions'),
        ),
    ]