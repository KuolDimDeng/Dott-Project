# Generated manually to add missing due_date field to SalesOrder model

from django.db import migrations, models
import sales.models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0003_rename_sales_estimate_tenant_idx_sales_estim_tenant__bfa1b9_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='salesorder',
            name='due_date',
            field=models.DateField(default=sales.models.default_due_datetime),
        ),
    ]