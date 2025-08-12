# Generated manually for Wise integration
from django.db import migrations, models
import django.db.models.deletion
import uuid
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ('banking', '0007_merge_20250727_2123'),
        ('custom_auth', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='WiseItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('bank_name', models.CharField(max_length=255)),
                ('bank_country', models.CharField(max_length=2)),
                ('account_holder_name', models.CharField(max_length=255)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('account_number_last4', models.CharField(blank=True, max_length=4)),
                ('routing_number_last4', models.CharField(blank=True, max_length=4)),
                ('iban_last4', models.CharField(blank=True, max_length=4)),
                ('stripe_external_account_id', models.CharField(blank=True, max_length=255)),
                ('stripe_bank_account_token', models.CharField(blank=True, max_length=255)),
                ('wise_recipient_id', models.CharField(blank=True, max_length=100)),
                ('is_verified', models.BooleanField(default=False)),
                ('verification_date', models.DateTimeField(blank=True, null=True)),
                ('last_transfer_date', models.DateTimeField(blank=True, null=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.user')),
            ],
            options={
                'db_table': 'banking_wise_item',
            },
        ),
        migrations.CreateModel(
            name='PaymentSettlement',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('stripe_payment_intent_id', models.CharField(max_length=255, unique=True)),
                ('original_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('stripe_fee', models.DecimalField(decimal_places=2, max_digits=10)),
                ('platform_fee', models.DecimalField(decimal_places=2, max_digits=10)),
                ('wise_fee_estimate', models.DecimalField(decimal_places=2, max_digits=10, null=True)),
                ('wise_fee_actual', models.DecimalField(decimal_places=2, max_digits=10, null=True)),
                ('settlement_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('user_receives', models.DecimalField(decimal_places=2, max_digits=10, null=True)),
                ('wise_transfer_id', models.CharField(blank=True, max_length=255)),
                ('wise_recipient_id', models.CharField(blank=True, max_length=255)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed'), ('cancelled', 'Cancelled')], default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('failed_at', models.DateTimeField(blank=True, null=True)),
                ('failure_reason', models.TextField(blank=True)),
                ('pos_transaction_id', models.CharField(blank=True, max_length=255)),
                ('customer_email', models.EmailField(blank=True, max_length=254)),
                ('notes', models.TextField(blank=True)),
                ('bank_account', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='banking.bankaccount')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.user')),
            ],
            options={
                'db_table': 'banking_payment_settlement',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='paymentsettlement',
            index=models.Index(fields=['status', 'created_at'], name='banking_pay_status_7c3d7a_idx'),
        ),
        migrations.AddIndex(
            model_name='paymentsettlement',
            index=models.Index(fields=['user', 'status'], name='banking_pay_user_id_5a8f9e_idx'),
        ),
    ]