# Generated migration for enhanced permission system

from django.db import migrations, models
import django.db.models.deletion
import uuid
from django.utils import timezone


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0022_merge_20250816'),  # Update to actual last migration
    ]

    operations = [
        # Create PermissionTemplate model
        migrations.CreateModel(
            name='PermissionTemplate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('code', models.CharField(help_text="Unique identifier like 'sales_manager'", max_length=50, unique=True)),
                ('description', models.TextField()),
                ('permissions', models.JSONField(default=dict, help_text='Dictionary of page permissions')),
                ('template_type', models.CharField(choices=[('SYSTEM', 'System Template'), ('CUSTOM', 'Custom Template')], default='CUSTOM', max_length=10)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_templates', to='custom_auth.user')),
                ('tenant', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
            ],
            options={
                'db_table': 'permission_templates',
                'ordering': ['template_type', 'name'],
            },
        ),
        
        # Create Department model
        migrations.CreateModel(
            name='Department',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('code', models.CharField(help_text="Department code like 'SALES', 'HR'", max_length=50)),
                ('description', models.TextField(blank=True)),
                ('default_permissions', models.JSONField(blank=True, default=dict)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('default_template', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='custom_auth.permissiontemplate')),
                ('manager', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='managed_departments', to='custom_auth.user')),
                ('parent_department', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sub_departments', to='custom_auth.department')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
            ],
            options={
                'db_table': 'departments',
                'ordering': ['name'],
            },
        ),
        
        # Create UserDepartment model
        migrations.CreateModel(
            name='UserDepartment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('role', models.CharField(choices=[('MEMBER', 'Member'), ('LEAD', 'Team Lead'), ('MANAGER', 'Manager'), ('HEAD', 'Department Head')], default='MEMBER', max_length=20)),
                ('joined_date', models.DateField(default=timezone.now)),
                ('left_date', models.DateField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('department', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='members', to='custom_auth.department')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='department_memberships', to='custom_auth.user')),
            ],
            options={
                'db_table': 'user_departments',
                'ordering': ['-is_active', 'department__name'],
            },
        ),
        
        # Create TemporaryPermission model
        migrations.CreateModel(
            name='TemporaryPermission',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('permissions', models.JSONField(help_text='Temporary permissions to grant')),
                ('reason', models.TextField(help_text='Reason for temporary access')),
                ('valid_from', models.DateTimeField(default=timezone.now)),
                ('valid_until', models.DateTimeField()),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('revoked', models.BooleanField(default=False)),
                ('revoked_at', models.DateTimeField(blank=True, null=True)),
                ('revoke_reason', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('approved_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_temp_permissions', to='custom_auth.user')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_temp_permissions', to='custom_auth.user')),
                ('revoked_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='revoked_temp_permissions', to='custom_auth.user')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='temporary_permissions', to='custom_auth.user')),
            ],
            options={
                'db_table': 'temporary_permissions',
                'ordering': ['-created_at'],
            },
        ),
        
        # Create PermissionDelegation model
        migrations.CreateModel(
            name='PermissionDelegation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('permissions_to_delegate', models.JSONField(help_text="Specific permissions to delegate, or 'ALL' for all")),
                ('reason', models.TextField(help_text='Reason for delegation (e.g., vacation, sick leave)')),
                ('start_date', models.DateTimeField()),
                ('end_date', models.DateTimeField()),
                ('is_active', models.BooleanField(default=True)),
                ('accepted', models.BooleanField(default=False)),
                ('accepted_at', models.DateTimeField(blank=True, null=True)),
                ('revoked', models.BooleanField(default=False)),
                ('revoked_at', models.DateTimeField(blank=True, null=True)),
                ('revoke_reason', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('delegate', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='received_delegations', to='custom_auth.user')),
                ('delegator', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='delegated_permissions', to='custom_auth.user')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
            ],
            options={
                'db_table': 'permission_delegations',
                'ordering': ['-created_at'],
            },
        ),
        
        # Create PermissionAuditLog model
        migrations.CreateModel(
            name='PermissionAuditLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('action', models.CharField(choices=[('GRANT', 'Permission Granted'), ('REVOKE', 'Permission Revoked'), ('MODIFY', 'Permission Modified'), ('TEMPLATE_APPLY', 'Template Applied'), ('BULK_UPDATE', 'Bulk Update'), ('DELEGATION', 'Permission Delegated'), ('TEMP_GRANT', 'Temporary Grant')], max_length=20)),
                ('old_permissions', models.JSONField(blank=True, null=True)),
                ('new_permissions', models.JSONField(blank=True, null=True)),
                ('changes_summary', models.TextField(help_text='Human-readable summary of changes')),
                ('change_reason', models.TextField(blank=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('changed_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='permission_changes_made', to='custom_auth.user')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='permission_audit_logs', to='custom_auth.user')),
            ],
            options={
                'db_table': 'permission_audit_logs',
                'ordering': ['-created_at'],
            },
        ),
        
        # Create PermissionRequest model
        migrations.CreateModel(
            name='PermissionRequest',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('requested_permissions', models.JSONField()),
                ('justification', models.TextField(help_text='Business justification for the request')),
                ('is_permanent', models.BooleanField(default=False)),
                ('requested_duration_days', models.IntegerField(blank=True, help_text='Duration in days if not permanent', null=True)),
                ('status', models.CharField(choices=[('PENDING', 'Pending Review'), ('APPROVED', 'Approved'), ('DENIED', 'Denied'), ('CANCELLED', 'Cancelled')], default='PENDING', max_length=10)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('review_notes', models.TextField(blank=True)),
                ('approved_permissions', models.JSONField(blank=True, help_text='Actually granted permissions (may differ from requested)', null=True)),
                ('valid_until', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('requester', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='permission_requests', to='custom_auth.user')),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_permission_requests', to='custom_auth.user')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='custom_auth.tenant')),
            ],
            options={
                'db_table': 'permission_requests',
                'ordering': ['-created_at'],
            },
        ),
        
        # Add indexes
        migrations.AddIndex(
            model_name='permissionauditlog',
            index=models.Index(fields=['user', '-created_at'], name='custom_auth_user_id_4f5c9a_idx'),
        ),
        migrations.AddIndex(
            model_name='permissionauditlog',
            index=models.Index(fields=['changed_by', '-created_at'], name='custom_auth_changed_0a5c6b_idx'),
        ),
        migrations.AddIndex(
            model_name='permissionauditlog',
            index=models.Index(fields=['action', '-created_at'], name='custom_auth_action_9b7d8c_idx'),
        ),
        
        # Add unique constraints
        migrations.AddConstraint(
            model_name='permissiontemplate',
            constraint=models.UniqueConstraint(fields=('code', 'tenant'), name='unique_template_code_per_tenant'),
        ),
        migrations.AddConstraint(
            model_name='department',
            constraint=models.UniqueConstraint(fields=('code', 'tenant'), name='unique_department_code_per_tenant'),
        ),
        migrations.AddConstraint(
            model_name='userdepartment',
            constraint=models.UniqueConstraint(fields=('user', 'department'), name='unique_user_department'),
        ),
    ]