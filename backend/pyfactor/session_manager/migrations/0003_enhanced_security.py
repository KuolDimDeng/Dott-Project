# Generated manually for enhanced security features

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('session_manager', '0002_auto_20250107_0000'),
        ('custom_auth', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DeviceFingerprint',
            fields=[
                ('fingerprint_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('fingerprint_hash', models.CharField(db_index=True, help_text='SHA256 hash of device fingerprint components', max_length=64, unique=True)),
                ('user_agent', models.TextField()),
                ('screen_resolution', models.CharField(blank=True, max_length=20, null=True)),
                ('timezone', models.CharField(blank=True, max_length=50, null=True)),
                ('language', models.CharField(blank=True, max_length=10, null=True)),
                ('platform', models.CharField(blank=True, max_length=50, null=True)),
                ('webgl_vendor', models.CharField(blank=True, max_length=100, null=True)),
                ('webgl_renderer', models.CharField(blank=True, max_length=100, null=True)),
                ('canvas_fingerprint', models.CharField(blank=True, max_length=64, null=True)),
                ('ip_address', models.GenericIPAddressField()),
                ('ip_country', models.CharField(blank=True, max_length=2, null=True)),
                ('ip_region', models.CharField(blank=True, max_length=100, null=True)),
                ('is_trusted', models.BooleanField(default=False)),
                ('trust_score', models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('risk_score', models.IntegerField(default=50, help_text='0=low risk, 100=high risk', validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('risk_factors', models.JSONField(default=dict)),
                ('first_seen', models.DateTimeField(auto_now_add=True)),
                ('last_seen', models.DateTimeField(auto_now=True)),
                ('login_count', models.IntegerField(default=0)),
                ('failed_login_count', models.IntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('is_blocked', models.BooleanField(default=False)),
                ('blocked_reason', models.TextField(blank=True, null=True)),
                ('blocked_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='device_fingerprints', to='custom_auth.customuser')),
            ],
            options={
                'db_table': 'device_fingerprints',
                'unique_together': {('user', 'fingerprint_hash')},
            },
        ),
        migrations.CreateModel(
            name='SessionSecurity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('initial_risk_score', models.IntegerField(default=50, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('current_risk_score', models.IntegerField(default=50, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('risk_factors', models.JSONField(default=dict)),
                ('is_verified', models.BooleanField(default=False)),
                ('verification_method', models.CharField(blank=True, choices=[('password', 'Password'), ('mfa', 'Multi-factor Authentication'), ('email', 'Email Verification'), ('trusted_device', 'Trusted Device')], max_length=50, null=True)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('anomaly_score', models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('anomalies_detected', models.JSONField(default=list)),
                ('last_heartbeat', models.DateTimeField(default=django.utils.timezone.now)),
                ('heartbeat_interval', models.IntegerField(default=60, help_text='Expected heartbeat interval in seconds')),
                ('missed_heartbeats', models.IntegerField(default=0)),
                ('security_events', models.JSONField(default=list)),
                ('device_fingerprint', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='session_manager.devicefingerprint')),
                ('session', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='security', to='session_manager.usersession')),
            ],
            options={
                'db_table': 'session_security',
            },
        ),
        migrations.CreateModel(
            name='DeviceTrust',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('trust_name', models.CharField(help_text='User-friendly name for the device', max_length=100)),
                ('trusted_at', models.DateTimeField(auto_now_add=True)),
                ('trusted_until', models.DateTimeField(blank=True, help_text='Optional expiration for trust', null=True)),
                ('verification_code', models.CharField(blank=True, help_text='Code sent for device verification', max_length=6, null=True)),
                ('verified', models.BooleanField(default=False)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('last_used', models.DateTimeField(auto_now=True)),
                ('use_count', models.IntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('revoked_at', models.DateTimeField(blank=True, null=True)),
                ('revoked_reason', models.TextField(blank=True, null=True)),
                ('device_fingerprint', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='session_manager.devicefingerprint')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='trusted_devices', to='custom_auth.customuser')),
            ],
            options={
                'db_table': 'device_trust',
                'unique_together': {('user', 'device_fingerprint')},
            },
        ),
        migrations.AddIndex(
            model_name='devicefingerprint',
            index=models.Index(fields=['user', 'is_active'], name='device_fing_user_id_6a3c3f_idx'),
        ),
        migrations.AddIndex(
            model_name='devicefingerprint',
            index=models.Index(fields=['fingerprint_hash'], name='device_fing_fingerp_8c3d77_idx'),
        ),
        migrations.AddIndex(
            model_name='devicefingerprint',
            index=models.Index(fields=['risk_score', 'is_active'], name='device_fing_risk_sc_f4a2b8_idx'),
        ),
        migrations.AddIndex(
            model_name='sessionsecurity',
            index=models.Index(fields=['current_risk_score'], name='session_sec_current_d9c4a1_idx'),
        ),
        migrations.AddIndex(
            model_name='sessionsecurity',
            index=models.Index(fields=['last_heartbeat'], name='session_sec_last_he_7f8b9c_idx'),
        ),
        migrations.AddIndex(
            model_name='devicetrust',
            index=models.Index(fields=['user', 'is_active'], name='device_trus_user_id_8a2c4d_idx'),
        ),
    ]