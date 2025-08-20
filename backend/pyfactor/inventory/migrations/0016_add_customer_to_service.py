# Generated manually for adding customer field to Service model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0001_initial'),
        ('inventory', '0015_add_service_is_active'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='customer',
            field=models.ForeignKey(
                blank=True,
                help_text='Link to specific customer for automated recurring invoices',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='services',
                to='crm.customer'
            ),
        ),
        migrations.AddField(
            model_name='service',
            name='next_invoice_date',
            field=models.DateField(
                blank=True,
                help_text='Date when next invoice should be generated',
                null=True
            ),
        ),
        migrations.AddField(
            model_name='service',
            name='last_invoice_date',
            field=models.DateField(
                blank=True,
                help_text='Date when last invoice was generated',
                null=True
            ),
        ),
    ]