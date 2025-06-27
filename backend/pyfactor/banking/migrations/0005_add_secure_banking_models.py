# Generated manually for secure banking tools

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('banking', '0004_bankaccount_tenant_id_banktransaction_tenant_id_and_more'),
    ]

    operations = [
        # Add new fields to BankTransaction
        migrations.AddField(
            model_name='banktransaction',
            name='import_id',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='banktransaction',
            name='import_batch',
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='banktransaction',
            name='imported_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='banktransaction',
            name='imported_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='imported_transactions', to=settings.AUTH_USER_MODEL),
        ),
        
        # Create BankingRule model
        migrations.CreateModel(
            name='BankingRule',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.UUIDField(blank=True, db_index=True, null=True)),
                ('name', models.CharField(max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('condition_type', models.CharField(choices=[('contains', 'Contains'), ('equals', 'Equals'), ('starts_with', 'Starts with'), ('ends_with', 'Ends with'), ('amount_equals', 'Amount equals'), ('amount_greater', 'Amount greater than'), ('amount_less', 'Amount less than'), ('amount_between', 'Amount between')], max_length=50)),
                ('condition_field', models.CharField(default='description', max_length=50)),
                ('condition_value', models.CharField(max_length=500)),
                ('category', models.CharField(max_length=100)),
                ('tags', models.JSONField(blank=True, default=list)),
                ('times_used', models.IntegerField(default=0)),
                ('last_used', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'banking_rules',
                'ordering': ['-times_used', 'name'],
            },
        ),
        
        # Create BankingAuditLog model
        migrations.CreateModel(
            name='BankingAuditLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.UUIDField(blank=True, db_index=True, null=True)),
                ('action', models.CharField(choices=[('import_csv', 'Imported CSV'), ('create_rule', 'Created Rule'), ('update_rule', 'Updated Rule'), ('delete_rule', 'Deleted Rule'), ('reconcile', 'Reconciled Transactions'), ('export_data', 'Exported Data'), ('view_transactions', 'Viewed Transactions')], max_length=100)),
                ('ip_address', models.GenericIPAddressField()),
                ('user_agent', models.TextField()),
                ('affected_records', models.IntegerField(default=0)),
                ('details', models.JSONField(default=dict)),
                ('status', models.CharField(choices=[('success', 'Success'), ('failed', 'Failed'), ('partial', 'Partial Success')], max_length=20)),
                ('error_message', models.TextField(blank=True)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('duration_ms', models.IntegerField(blank=True, null=True)),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'banking_audit_log',
                'ordering': ['-started_at'],
            },
        ),
        
        # Add indexes
        migrations.AddIndex(
            model_name='bankingauditlog',
            index=models.Index(fields=['user', 'action'], name='banking_aud_user_id_f6d8ae_idx'),
        ),
        migrations.AddIndex(
            model_name='bankingauditlog',
            index=models.Index(fields=['started_at'], name='banking_aud_started_d3c3f4_idx'),
        ),
    ]