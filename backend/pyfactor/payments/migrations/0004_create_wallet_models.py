# Generated manually for wallet models
from django.db import migrations, models
import django.db.models.deletion
import uuid
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0003_dual_qr_system'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('custom_auth', '0001_initial'),
    ]

    operations = [
        # Create MobileMoneyWallet model
        migrations.CreateModel(
            name='MobileMoneyWallet',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('phone_number', models.CharField(db_index=True, max_length=20)),
                ('wallet_type', models.CharField(choices=[('personal', 'Personal'), ('business', 'Business')], default='personal', max_length=20)),
                ('business_id', models.UUIDField(blank=True, help_text='ID of the business if this is a business wallet', null=True)),
                ('balance', models.DecimalField(decimal_places=2, default=0.00, max_digits=15)),
                ('available_balance', models.DecimalField(decimal_places=2, default=0.00, max_digits=15)),
                ('pending_balance', models.DecimalField(decimal_places=2, default=0.00, max_digits=15)),
                ('verification_status', models.CharField(choices=[('unverified', 'Unverified'), ('pending', 'Pending Verification'), ('verified', 'Verified'), ('suspended', 'Suspended')], default='unverified', max_length=20)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('daily_limit', models.DecimalField(decimal_places=2, default=1000.00, max_digits=15)),
                ('monthly_limit', models.DecimalField(decimal_places=2, default=30000.00, max_digits=15)),
                ('daily_spent', models.DecimalField(decimal_places=2, default=0.00, max_digits=15)),
                ('monthly_spent', models.DecimalField(decimal_places=2, default=0.00, max_digits=15)),
                ('last_reset_date', models.DateField(blank=True, null=True)),
                ('pin_hash', models.CharField(blank=True, max_length=255, null=True)),
                ('pin_attempts', models.IntegerField(default=0)),
                ('pin_locked_until', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='wallets', to=settings.AUTH_USER_MODEL)),
                ('provider', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='payments.mobilemoneyprovider', to_field='name')),
            ],
            options={
                'db_table': 'payments_mobilemoney_wallet',
                'indexes': [models.Index(fields=['phone_number'], name='payments_mo_phone_n_8a0a5f_idx'), models.Index(fields=['user', 'is_active'], name='payments_mo_user_id_c3e0a7_idx')],
            },
        ),
        # Create WalletTransaction model
        migrations.CreateModel(
            name='WalletTransaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('transaction_type', models.CharField(choices=[('credit', 'Credit'), ('debit', 'Debit'), ('transfer_in', 'Transfer In'), ('transfer_out', 'Transfer Out'), ('topup', 'Top Up'), ('withdrawal', 'Withdrawal'), ('fee', 'Transaction Fee'), ('refund', 'Refund'), ('bank_transfer', 'Bank Transfer')], max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('fee', models.DecimalField(decimal_places=2, default=0.00, max_digits=10)),
                ('balance_before', models.DecimalField(decimal_places=2, default=0.00, max_digits=15)),
                ('balance_after', models.DecimalField(decimal_places=2, max_digits=15)),
                ('reference', models.CharField(db_index=True, max_length=100, unique=True)),
                ('external_reference', models.CharField(blank=True, max_length=100, null=True)),
                ('description', models.TextField()),
                ('recipient_phone', models.CharField(blank=True, max_length=20, null=True)),
                ('recipient_name', models.CharField(blank=True, max_length=100, null=True)),
                ('sender_phone', models.CharField(blank=True, max_length=20, null=True)),
                ('sender_name', models.CharField(blank=True, max_length=100, null=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed'), ('cancelled', 'Cancelled'), ('reversed', 'Reversed')], default='pending', max_length=20)),
                ('failure_reason', models.TextField(blank=True, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('related_transaction', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='payments.wallettransaction')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
                ('wallet', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='payments.mobilemoneywallet')),
            ],
            options={
                'db_table': 'payments_wallet_transaction',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['wallet', '-created_at'], name='payments_wa_wallet__9a8b5c_idx'), models.Index(fields=['reference'], name='payments_wa_referen_6d2e1a_idx'), models.Index(fields=['status'], name='payments_wa_status_8c4f7b_idx'), models.Index(fields=['transaction_type'], name='payments_wa_transac_3e9d2f_idx')],
            },
        ),
        # Create WalletTransferRequest model
        migrations.CreateModel(
            name='WalletTransferRequest',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('recipient_phone', models.CharField(max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('description', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected'), ('expired', 'Expired'), ('cancelled', 'Cancelled')], default='pending', max_length=20)),
                ('expires_at', models.DateTimeField()),
                ('responded_at', models.DateTimeField(blank=True, null=True)),
                ('response_message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('recipient_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='wallet_requests_received', to=settings.AUTH_USER_MODEL)),
                ('requester', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='wallet_requests_sent', to=settings.AUTH_USER_MODEL)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
                ('transaction', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='payments.wallettransaction')),
            ],
            options={
                'db_table': 'payments_wallet_transfer_request',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['requester', 'status'], name='payments_wa_request_4b6e8a_idx'), models.Index(fields=['recipient_user', 'status'], name='payments_wa_recipie_9c3d1f_idx'), models.Index(fields=['recipient_phone'], name='payments_wa_recipie_7a5b2e_idx')],
            },
        ),
        # Create WalletTopUp model
        migrations.CreateModel(
            name='WalletTopUp',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('stripe_payment_intent_id', models.CharField(blank=True, max_length=255, null=True, unique=True)),
                ('stripe_payment_method_id', models.CharField(blank=True, max_length=255, null=True)),
                ('stripe_charge_id', models.CharField(blank=True, max_length=255, null=True)),
                ('stripe_fee', models.DecimalField(decimal_places=2, default=0.00, max_digits=10)),
                ('platform_fee', models.DecimalField(decimal_places=2, default=0.00, max_digits=10)),
                ('total_fee', models.DecimalField(decimal_places=2, default=0.00, max_digits=10)),
                ('status', models.CharField(choices=[('initiated', 'Initiated'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed'), ('refunded', 'Refunded')], default='initiated', max_length=20)),
                ('failure_reason', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
                ('transaction', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='payments.wallettransaction')),
                ('wallet', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='topups', to='payments.mobilemoneywallet')),
            ],
            options={
                'db_table': 'payments_wallet_topup',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['wallet', '-created_at'], name='payments_wa_wallet__8d7a2c_idx'), models.Index(fields=['stripe_payment_intent_id'], name='payments_wa_stripe__5e9b1a_idx'), models.Index(fields=['status'], name='payments_wa_status_7c4a3b_idx')],
            },
        ),
        # Add unique together constraint
        migrations.AddConstraint(
            model_name='mobilemoneywallet',
            constraint=models.UniqueConstraint(fields=('user', 'provider'), name='unique_user_provider'),
        ),
    ]