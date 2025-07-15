# Generated manually to fix model references

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
        ('sales', '0001_initial'),
        ('purchases', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='invoicepayment',
            name='invoice',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stripe_payments', to='sales.invoice'),
        ),
        migrations.AlterField(
            model_name='vendorpayment',
            name='vendor',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stripe_payments', to='purchases.vendor'),
        ),
    ]