# Generated migration for Dott Pay models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('payments', '0001_initial'),
        ('hr', '0001_initial'),
        ('sales', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DottPayProfile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=50)),
                ('qr_code_id', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('qr_code_version', models.CharField(default='1.0', max_length=10)),
                ('qr_code_encrypted', models.TextField(blank=True, null=True)),
                ('pin_hash', models.CharField(blank=True, max_length=256, null=True)),
                ('biometric_enabled', models.BooleanField(default=False)),
                ('two_factor_required', models.BooleanField(default=False)),
                ('daily_limit', models.DecimalField(decimal_places=2, default=5000.0, max_digits=15)),
                ('single_transaction_limit', models.DecimalField(decimal_places=2, default=1000.0, max_digits=15)),
                ('daily_spent', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('daily_spent_reset_at', models.DateTimeField(auto_now_add=True)),
                ('auto_approve_under', models.DecimalField(decimal_places=2, default=50.0, help_text='Auto-approve transactions under this amount', max_digits=15)),
                ('is_active', models.BooleanField(default=True)),
                ('is_suspended', models.BooleanField(default=False)),
                ('suspension_reason', models.TextField(blank=True, null=True)),
                ('total_transactions', models.IntegerField(default=0)),
                ('total_amount_spent', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('last_transaction_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('default_payment_method', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='dott_pay_default', to='payments.paymentmethod')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='dott_pay_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'payments_dott_pay_profile',
            },
        ),
        migrations.CreateModel(
            name='DottPayTransaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=50)),
                ('transaction_id', models.CharField(max_length=100, unique=True)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('approved', 'Approved'), ('declined', 'Declined'), ('cancelled', 'Cancelled'), ('refunded', 'Refunded')], default='pending', max_length=20)),
                ('approval_required', models.BooleanField(default=False)),
                ('approval_code', models.CharField(blank=True, max_length=10, null=True)),
                ('gateway_response', models.JSONField(blank=True, default=dict)),
                ('gateway_transaction_id', models.CharField(blank=True, max_length=200, null=True)),
                ('qr_scan_timestamp', models.DateTimeField()),
                ('merchant_location', models.JSONField(blank=True, default=dict)),
                ('device_fingerprint', models.CharField(blank=True, max_length=200, null=True)),
                ('platform_fee', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('gateway_fee', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('net_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=15)),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('consumer_profile', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='dott_pay_transactions', to='payments.dottpayprofile')),
                ('merchant_user', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='dott_pay_merchant_transactions', to=settings.AUTH_USER_MODEL)),
                ('payment_method', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='dott_pay_transactions', to='payments.paymentmethod')),
                ('pos_transaction', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='dott_pay_transaction', to='sales.postransaction')),
            ],
            options={
                'db_table': 'payments_dott_pay_transaction',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='DottPaySecurityLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=50)),
                ('event_type', models.CharField(choices=[('qr_scan', 'QR Code Scanned'), ('transaction_approved', 'Transaction Approved'), ('transaction_declined', 'Transaction Declined'), ('pin_failed', 'PIN Verification Failed'), ('limit_exceeded', 'Transaction Limit Exceeded'), ('suspicious_activity', 'Suspicious Activity Detected'), ('profile_updated', 'Profile Settings Updated')], max_length=50)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True, null=True)),
                ('location', models.JSONField(blank=True, default=dict)),
                ('device_info', models.JSONField(blank=True, default=dict)),
                ('event_data', models.JSONField(blank=True, default=dict)),
                ('risk_score', models.IntegerField(default=0, help_text='0-100, higher is riskier')),
                ('is_flagged', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('profile', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='security_logs', to='payments.dottpayprofile')),
                ('transaction', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='security_logs', to='payments.dottpaytransaction')),
            ],
            options={
                'db_table': 'payments_dott_pay_security_log',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='dottpayprofile',
            index=models.Index(fields=['qr_code_id'], name='payments_do_qr_code_6c8a9f_idx'),
        ),
        migrations.AddIndex(
            model_name='dottpayprofile',
            index=models.Index(fields=['user', 'is_active'], name='payments_do_user_id_8e3d4a_idx'),
        ),
        migrations.AddIndex(
            model_name='dottpaytransaction',
            index=models.Index(fields=['transaction_id'], name='payments_do_transac_9f3b2c_idx'),
        ),
        migrations.AddIndex(
            model_name='dottpaytransaction',
            index=models.Index(fields=['consumer_profile', 'status'], name='payments_do_consume_7d2e1f_idx'),
        ),
        migrations.AddIndex(
            model_name='dottpaytransaction',
            index=models.Index(fields=['merchant_user', 'created_at'], name='payments_do_merchan_4a6b8d_idx'),
        ),
        migrations.AddIndex(
            model_name='dottpaysecuritylog',
            index=models.Index(fields=['profile', 'event_type'], name='payments_do_profile_3e7c9b_idx'),
        ),
        migrations.AddIndex(
            model_name='dottpaysecuritylog',
            index=models.Index(fields=['created_at', 'is_flagged'], name='payments_do_created_1f4d7a_idx'),
        ),
    ]