#/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/migrations/0001_initial.py
import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0013_initial_structure'),
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('email', models.EmailField(max_length=254, unique=True, verbose_name='email address')),
                ('first_name', models.CharField(blank=True, max_length=100)),
                ('last_name', models.CharField(blank=True, max_length=100)),
                ('is_active', models.BooleanField(default=True)),
                ('is_staff', models.BooleanField(default=False)),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now)),
                ('email_confirmed', models.BooleanField(default=False)),
                ('confirmation_token', models.UUIDField(default=uuid.uuid4, editable=False)),
                ('is_onboarded', models.BooleanField(default=False)),
                ('stripe_customer_id', models.CharField(blank=True, max_length=255, null=True)),
                ('cognito_sub', models.CharField(blank=True, max_length=36, null=True, unique=True)),
                ('role', models.CharField(choices=[('OWNER', 'Business Owner'), ('ADMIN', 'Administrator'), ('EMPLOYEE', 'Employee')], default='OWNER', max_length=20)),
                ('occupation', models.CharField(choices=[('OWNER', 'Owner'), ('Freelancer', 'Freelancer'), ('CEO', 'Chief Executive Officer'), ('CFO', 'Chief Financial Officer'), ('CTO', 'Chief Technology Officer'), ('COO', 'Chief Operating Officer'), ('MANAGER', 'Manager'), ('DIRECTOR', 'Director'), ('SUPERVISOR', 'Supervisor'), ('TEAM_LEAD', 'Team Lead'), ('ACCOUNTANT', 'Accountant'), ('FINANCIAL_ANALYST', 'Financial Analyst'), ('HR_MANAGER', 'HR Manager'), ('MARKETING_MANAGER', 'Marketing Manager'), ('SALES_MANAGER', 'Sales Manager'), ('CUSTOMER_SERVICE_REP', 'Customer Service Representative'), ('ADMINISTRATIVE_ASSISTANT', 'Administrative Assistant'), ('CLERK', 'Clerk'), ('DEVELOPER', 'Developer'), ('DESIGNER', 'Designer'), ('CONSULTANT', 'Consultant'), ('STAFF', 'Staff'), ('EMPLOYEE', 'Employee'), ('ENGINEER', 'Engineer'), ('CONTRACTOR', 'Contractor'), ('TRAINER', 'Trainer'), ('IT_ADMIN', 'IT Admin'), ('IT_SUPPORT', 'IT Support'), ('OTHER', 'Other')], default='OWNER', max_length=50)),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'db_table': 'custom_auth_user',
            },
        ),
        migrations.CreateModel(
            name='Tenant',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('schema_name', models.CharField(max_length=63, unique=True)),
                ('name', models.CharField(max_length=100)),
                ('created_on', models.DateTimeField(auto_now_add=True)),
                ('is_active', models.BooleanField(default=True)),
                ('database_status', models.CharField(choices=[('not_created', 'Not Created'), ('pending', 'Pending'), ('active', 'Active'), ('inactive', 'Inactive'), ('error', 'Error')], default='not_created', max_length=50)),
                ('setup_status', models.CharField(choices=[('not_started', 'Not Started'), ('pending', 'Pending'), ('in_progress', 'In Progress'), ('complete', 'Complete'), ('error', 'Error')], default='not_started', max_length=20)),
                ('last_setup_attempt', models.DateTimeField(blank=True, null=True)),
                ('setup_error_message', models.TextField(blank=True, null=True)),
                ('last_health_check', models.DateTimeField(blank=True, null=True)),
                ('setup_task_id', models.CharField(blank=True, max_length=255, null=True)),
                ('storage_quota_bytes', models.BigIntegerField(default=2147483648)),
                ('last_archive_date', models.DateTimeField(blank=True, null=True)),
                ('archive_retention_days', models.IntegerField(default=2555)),
                ('archive_expiry_notification_sent', models.BooleanField(default=False)),
                ('archive_expiry_notification_date', models.DateTimeField(blank=True, null=True)),
                ('archive_user_decision', models.CharField(choices=[('pending', 'Pending Decision'), ('export', 'Export and Delete'), ('delete', 'Delete Without Export'), ('extend', 'Extend Retention')], default='pending', max_length=20)),
                ('owner', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='owned_tenant', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'custom_auth_tenant',
            },
        ),
        migrations.AddField(
            model_name='user',
            name='tenant',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='users', to='custom_auth.tenant'),
        ),
    ]
