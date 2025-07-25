# Generated manually to change BonusPayment.approved_by from UUIDField to User ForeignKey

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0001_initial'),
        ('payroll', '0008_add_payment_provider_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='bonuspayment',
            name='approved_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='approved_bonuses',
                to='custom_auth.User'
            ),
        ),
    ]