# Generated migration for Auth0 models

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Auth0User',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('auth0_id', models.CharField(db_index=True, max_length=255, unique=True)),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('name', models.CharField(blank=True, max_length=255)),
                ('picture', models.URLField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_login', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'db_table': 'auth0_users',
            },
        ),
        migrations.CreateModel(
            name='Tenant',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('business_type', models.CharField(max_length=100)),
                ('business_subtypes', models.JSONField(blank=True, default=dict)),
                ('country', models.CharField(max_length=2)),
                ('business_state', models.CharField(blank=True, max_length=100)),
                ('legal_structure', models.CharField(max_length=100)),
                ('date_founded', models.DateField()),
                ('industry', models.CharField(blank=True, max_length=100)),
                ('address', models.TextField(blank=True)),
                ('phone_number', models.CharField(blank=True, max_length=20)),
                ('tax_id', models.CharField(blank=True, max_length=50)),
                ('owner_first_name', models.CharField(max_length=50)),
                ('owner_last_name', models.CharField(max_length=50)),
                ('subscription_plan', models.CharField(choices=[('free', 'Free'), ('professional', 'Professional'), ('enterprise', 'Enterprise')], default='free', max_length=20)),
                ('billing_interval', models.CharField(choices=[('monthly', 'Monthly'), ('annual', 'Annual')], default='monthly', max_length=20)),
                ('subscription_status', models.CharField(choices=[('active', 'Active'), ('trialing', 'Trialing'), ('past_due', 'Past Due'), ('canceled', 'Canceled'), ('pending', 'Pending')], default='pending', max_length=20)),
                ('subscription_date', models.DateTimeField(blank=True, null=True)),
                ('onboarding_completed', models.BooleanField(default=False)),
                ('onboarding_step', models.CharField(default='business_info', max_length=50)),
                ('setup_done', models.BooleanField(default=False)),
                ('setup_freeplan', models.BooleanField(default=False)),
                ('setup_rlsused', models.BooleanField(default=False)),
                ('setup_skipdatabase', models.BooleanField(default=False)),
                ('schema_name', models.CharField(blank=True, max_length=100, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'tenants',
            },
        ),
        migrations.CreateModel(
            name='UserTenantRole',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('owner', 'Owner'), ('admin', 'Admin'), ('manager', 'Manager'), ('user', 'User')], default='user', max_length=20)),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='accounts.tenant')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='accounts.auth0user')),
            ],
            options={
                'db_table': 'user_tenant_roles',
                'unique_together': {('user', 'tenant')},
            },
        ),
        migrations.CreateModel(
            name='OnboardingProgress',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('business_info_completed', models.BooleanField(default=False)),
                ('subscription_selected', models.BooleanField(default=False)),
                ('payment_completed', models.BooleanField(default=False)),
                ('setup_completed', models.BooleanField(default=False)),
                ('stripe_customer_id', models.CharField(blank=True, max_length=255)),
                ('stripe_subscription_id', models.CharField(blank=True, max_length=255)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='accounts.tenant')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='accounts.auth0user')),
            ],
            options={
                'db_table': 'onboarding_progress',
                'unique_together': {('user', 'tenant')},
            },
        ),
        migrations.AddField(
            model_name='auth0user',
            name='current_tenant',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='accounts.tenant'),
        ),
    ]