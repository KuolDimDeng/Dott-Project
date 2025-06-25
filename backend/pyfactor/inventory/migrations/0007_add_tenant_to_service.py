# Generated manually to add tenant_id to Service model
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0001_initial'),  # Assuming this migration exists for Tenant model
        ('inventory', '0006_add_location_to_product'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='tenant',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='inventory_services',
                to='custom_auth.tenant'
            ),
        ),
        migrations.AddIndex(
            model_name='service',
            index=models.Index(fields=['tenant_id', 'name'], name='inventory_s_tenant__name_idx'),
        ),
        migrations.AddIndex(
            model_name='service',
            index=models.Index(fields=['tenant_id', 'service_code'], name='inventory_s_tenant__code_idx'),
        ),
    ]