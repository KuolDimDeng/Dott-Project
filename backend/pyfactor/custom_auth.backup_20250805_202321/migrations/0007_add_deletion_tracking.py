# Generated manually to match database schema after SQL migration
# This migration adds deletion tracking fields to the User model

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0006_remove_user_cognito_sub_user_email_verified_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_deleted',
            field=models.BooleanField(default=False, help_text='Soft delete flag - user account is closed'),
        ),
        migrations.AddField(
            model_name='user',
            name='deleted_at',
            field=models.DateTimeField(blank=True, help_text='When the account was closed', null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='deletion_reason',
            field=models.CharField(blank=True, help_text='Reason for account closure', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='deletion_feedback',
            field=models.TextField(blank=True, help_text='Additional feedback provided during account closure', null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='deletion_initiated_by',
            field=models.CharField(blank=True, help_text='Who initiated the deletion (user/admin/system)', max_length=255, null=True),
        ),
        migrations.CreateModel(
            name='AccountDeletionLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('user_email', models.EmailField(help_text='Email of the deleted account', max_length=254)),
                ('user_id', models.IntegerField(help_text='ID of the deleted user')),
                ('tenant_id', models.UUIDField(blank=True, help_text='ID of the associated tenant', null=True)),
                ('auth0_sub', models.CharField(blank=True, help_text='Auth0 subject identifier', max_length=255, null=True)),
                ('deletion_date', models.DateTimeField(auto_now_add=True)),
                ('deletion_reason', models.CharField(blank=True, max_length=255, null=True)),
                ('deletion_feedback', models.TextField(blank=True, null=True)),
                ('deletion_initiated_by', models.CharField(default='user', max_length=255)),
                ('auth0_deleted', models.BooleanField(default=False, help_text='Whether user was deleted from Auth0')),
                ('database_deleted', models.BooleanField(default=False, help_text='Whether user was deleted from database')),
                ('tenant_deleted', models.BooleanField(default=False, help_text='Whether tenant data was deleted')),
                ('deletion_errors', models.JSONField(blank=True, help_text='Any errors encountered during deletion', null=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True, null=True)),
            ],
            options={
                'db_table': 'custom_auth_account_deletion_log',
                'ordering': ['-deletion_date'],
            },
        ),
        migrations.AddIndex(
            model_name='accountdeletionlog',
            index=models.Index(fields=['user_email'], name='custom_auth_accountdeletionlog_user_email_idx'),
        ),
        migrations.AddIndex(
            model_name='accountdeletionlog',
            index=models.Index(fields=['deletion_date'], name='custom_auth_accountdeletionlog_deletion_date_idx'),
        ),
    ]