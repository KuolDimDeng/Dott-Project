# Generated migration for Dual QR System

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('payments', '0002_dott_pay_models'),
        ('banking', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='MerchantProfile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=50)),
                ('merchant_id', models.CharField(db_index=True, max_length=20, unique=True)),
                ('merchant_name', models.CharField(max_length=100)),
                ('merchant_type', models.CharField(choices=[('personal', 'Personal Account'), ('business', 'Business Account'), ('freelancer', 'Freelancer'), ('non_profit', 'Non-Profit'), ('government', 'Government')], default='personal', max_length=20)),
                ('business_category', models.CharField(blank=True, max_length=50, null=True)),
                ('receive_qr_id', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('static_qr_code', models.TextField(blank=True, null=True)),
                ('static_qr_color', models.CharField(default='#10b981', max_length=7)),
                ('qr_display_mode', models.CharField(choices=[('static', 'Static QR Only'), ('dynamic', 'Dynamic QR Only'), ('both', 'Both Static & Dynamic')], default='static', max_length=10)),
                ('settlement_method', models.CharField(choices=[('instant', 'Instant Settlement'), ('daily', 'Daily Settlement'), ('weekly', 'Weekly Settlement'), ('manual', 'Manual Withdrawal')], default='daily', max_length=10)),
                ('settlement_mpesa_number', models.CharField(blank=True, max_length=20, null=True)),
                ('settlement_mtn_number', models.CharField(blank=True, max_length=20, null=True)),
                ('minimum_settlement_amount', models.DecimalField(decimal_places=2, default=10.0, max_digits=15)),
                ('is_premium', models.BooleanField(default=False)),
                ('premium_expires_at', models.DateTimeField(blank=True, null=True)),
                ('custom_branding', models.JSONField(blank=True, default=dict)),
                ('multiple_locations', models.JSONField(blank=True, default=list)),
                ('daily_receive_limit', models.DecimalField(decimal_places=2, default=10000.0, max_digits=15)),
                ('single_receive_limit', models.DecimalField(decimal_places=2, default=5000.0, max_digits=15)),
                ('daily_received', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('daily_received_reset_at', models.DateTimeField(auto_now_add=True)),
                ('total_received', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('total_transactions_received', models.IntegerField(default=0)),
                ('average_transaction_value', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('last_received_at', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('is_verified', models.BooleanField(default=False)),
                ('verification_documents', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('settlement_bank_account', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='merchant_settlements', to='banking.bankaccount')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='merchant_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'payments_merchant_profile',
            },
        ),
        migrations.CreateModel(
            name='UniversalQR',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=50)),
                ('qr_type', models.CharField(choices=[('payment', 'Payment QR - Blue'), ('receive_static', 'Receive Static QR - Green'), ('receive_dynamic', 'Receive Dynamic QR - Green'), ('request', 'Payment Request QR - Yellow'), ('split', 'Bill Split QR - Purple'), ('refund', 'Refund QR - Red')], max_length=20)),
                ('qr_data', models.TextField()),
                ('qr_color', models.CharField(max_length=7)),
                ('is_active', models.BooleanField(default=True)),
                ('scan_count', models.IntegerField(default=0)),
                ('last_scanned_at', models.DateTimeField(blank=True, null=True)),
                ('amount', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True)),
                ('reference', models.CharField(blank=True, max_length=100, null=True)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='universal_qrs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'payments_universal_qr',
            },
        ),
        migrations.CreateModel(
            name='QRSafetyLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=50)),
                ('error_type', models.CharField(choices=[('both_paying', 'Both QRs are Payment (Blue)'), ('both_receiving', 'Both QRs are Receive (Green)'), ('expired_qr', 'QR Code Expired'), ('invalid_qr', 'Invalid QR Format'), ('limit_exceeded', 'Transaction Limit Exceeded'), ('inactive_account', 'Account Inactive')], max_length=20)),
                ('scanner_qr_type', models.CharField(max_length=20)),
                ('scanned_qr_type', models.CharField(max_length=20)),
                ('error_message', models.TextField()),
                ('location', models.JSONField(blank=True, default=dict)),
                ('device_info', models.JSONField(blank=True, default=dict)),
                ('was_corrected', models.BooleanField(default=False)),
                ('correction_action', models.CharField(blank=True, max_length=100, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('scanned_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='qr_scanned_errors', to=settings.AUTH_USER_MODEL)),
                ('scanner_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='qr_scan_errors', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'payments_qr_safety_log',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='P2PTransaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=50)),
                ('transaction_id', models.CharField(max_length=100, unique=True)),
                ('sender_qr_type', models.CharField(max_length=20)),
                ('receiver_qr_type', models.CharField(max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('description', models.TextField(blank=True, null=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed'), ('cancelled', 'Cancelled')], default='pending', max_length=20)),
                ('platform_fee', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('net_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('receiver', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='p2p_received', to=settings.AUTH_USER_MODEL)),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='p2p_sent', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'payments_p2p_transaction',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='DynamicQR',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=50)),
                ('qr_data', models.TextField()),
                ('amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('reference', models.CharField(max_length=100)),
                ('is_used', models.BooleanField(default=False)),
                ('used_at', models.DateTimeField(blank=True, null=True)),
                ('expires_at', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('merchant_profile', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dynamic_qrs', to='payments.merchantprofile')),
                ('used_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='used_dynamic_qrs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'payments_dynamic_qr',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='universalqr',
            index=models.Index(fields=['user', 'qr_type'], name='payments_un_user_id_2f4c8b_idx'),
        ),
        migrations.AddIndex(
            model_name='universalqr',
            index=models.Index(fields=['qr_type', 'is_active'], name='payments_un_qr_type_8d3a9f_idx'),
        ),
        migrations.AddIndex(
            model_name='qrsafetylog',
            index=models.Index(fields=['error_type', 'created_at'], name='payments_qr_error_t_3e7c9b_idx'),
        ),
        migrations.AddIndex(
            model_name='qrsafetylog',
            index=models.Index(fields=['scanner_user', 'error_type'], name='payments_qr_scanner_1f4d7a_idx'),
        ),
        migrations.AddIndex(
            model_name='p2ptransaction',
            index=models.Index(fields=['transaction_id'], name='payments_p2_transac_7d2e1f_idx'),
        ),
        migrations.AddIndex(
            model_name='p2ptransaction',
            index=models.Index(fields=['sender', 'status'], name='payments_p2_sender__4a6b8d_idx'),
        ),
        migrations.AddIndex(
            model_name='p2ptransaction',
            index=models.Index(fields=['receiver', 'status'], name='payments_p2_receive_9f3b2c_idx'),
        ),
        migrations.AddIndex(
            model_name='merchantprofile',
            index=models.Index(fields=['merchant_id'], name='payments_me_merchan_6c8a9f_idx'),
        ),
        migrations.AddIndex(
            model_name='merchantprofile',
            index=models.Index(fields=['user', 'is_active'], name='payments_me_user_id_8e3d4a_idx'),
        ),
        migrations.AddIndex(
            model_name='merchantprofile',
            index=models.Index(fields=['receive_qr_id'], name='payments_me_receive_2b5f7c_idx'),
        ),
        migrations.AddIndex(
            model_name='dynamicqr',
            index=models.Index(fields=['reference'], name='payments_dy_referen_5a9e3d_idx'),
        ),
        migrations.AddIndex(
            model_name='dynamicqr',
            index=models.Index(fields=['merchant_profile', 'is_used'], name='payments_dy_merchan_7c4b2e_idx'),
        ),
    ]