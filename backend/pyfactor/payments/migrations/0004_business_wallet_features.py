# Generated manually for business wallet features
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0003_dual_qr_system'),
    ]

    operations = [
        migrations.AddField(
            model_name='mobilemoneywallet',
            name='wallet_type',
            field=models.CharField(
                max_length=20,
                choices=[('personal', 'Personal'), ('business', 'Business')],
                default='personal'
            ),
        ),
        migrations.AddField(
            model_name='mobilemoneywallet',
            name='business_id',
            field=models.UUIDField(null=True, blank=True, help_text="ID of the business if this is a business wallet"),
        ),
        migrations.AlterField(
            model_name='wallettransaction',
            name='transaction_type',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('credit', 'Credit'),
                    ('debit', 'Debit'),
                    ('transfer_in', 'Transfer In'),
                    ('transfer_out', 'Transfer Out'),
                    ('topup', 'Top Up'),
                    ('withdrawal', 'Withdrawal'),
                    ('fee', 'Transaction Fee'),
                    ('refund', 'Refund'),
                    ('bank_transfer', 'Bank Transfer'),
                ]
            ),
        ),
    ]