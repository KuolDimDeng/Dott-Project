# Generated migration for admin security enhancements

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='adminuser',
            name='mfa_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='adminuser',
            name='mfa_secret',
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AddField(
            model_name='adminuser',
            name='mfa_backup_codes',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='adminuser',
            name='mfa_recovery_email',
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.CreateModel(
            name='AdminSession',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('access_token', models.TextField()),
                ('refresh_token', models.TextField(unique=True)),
                ('csrf_token', models.CharField(max_length=255)),
                ('ip_address', models.GenericIPAddressField()),
                ('user_agent', models.TextField()),
                ('mfa_verified', models.BooleanField(default=False)),
                ('mfa_verified_at', models.DateTimeField(blank=True, null=True)),
                ('last_activity', models.DateTimeField(auto_now=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('is_active', models.BooleanField(default=True)),
                ('revoked_at', models.DateTimeField(blank=True, null=True)),
                ('revoke_reason', models.CharField(blank=True, max_length=100)),
                ('admin_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sessions', to='notifications.adminuser')),
            ],
            options={
                'db_table': 'admin_sessions',
                'indexes': [
                    models.Index(fields=['refresh_token'], name='admin_sessi_refresh_0a6d6f_idx'),
                    models.Index(fields=['admin_user', 'is_active'], name='admin_sessi_admin_u_0e5f8a_idx'),
                    models.Index(fields=['expires_at'], name='admin_sessi_expires_2e7c3f_idx'),
                ],
            },
        ),
    ]