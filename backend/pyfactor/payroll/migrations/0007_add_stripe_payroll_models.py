# Generated manually for adding Stripe payroll payment models

from django.db import migrations, models
import django.db.models.deletion
import uuid
from decimal import Decimal
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('payroll', '0006_bonuspayment_tenant_id_incomewithholding_tenant_id_and_more'),
        ('hr', '0001_initial'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmployeeStripeAccount',
            fields=[
                ('tenant_id', models.UUIDField(blank=True, db_column='tenant_id', null=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('stripe_account_id', models.CharField(max_length=100, unique=True)),
                ('onboarding_complete', models.BooleanField(default=False)),
                ('charges_enabled', models.BooleanField(default=False)),
                ('payouts_enabled', models.BooleanField(default=False)),
                ('stripe_bank_token', models.CharField(blank=True, max_length=100)),
                ('bank_last4', models.CharField(blank=True, max_length=4)),
                ('bank_name', models.CharField(blank=True, max_length=100)),
                ('verification_status', models.CharField(choices=[('unverified', 'Unverified'), ('pending', 'Pending Verification'), ('verified', 'Verified'), ('restricted', 'Restricted')], default='unverified', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('employee', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='stripe_account', to='hr.employee')),
            ],
            options={
                'verbose_name': 'Employee Stripe Account',
                'verbose_name_plural': 'Employee Stripe Accounts',
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='PayrollStripePayment',
            fields=[
                ('tenant_id', models.UUIDField(blank=True, db_column='tenant_id', null=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('funding_payment_intent_id', models.CharField(blank=True, max_length=100)),
                ('funding_status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('succeeded', 'Succeeded'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('funding_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('platform_fee_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('platform_fee_percentage', models.DecimalField(decimal_places=3, default=Decimal('0.024'), max_digits=4)),
                ('ach_mandate_id', models.CharField(blank=True, max_length=100)),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('approval_signature_name', models.CharField(blank=True, max_length=200)),
                ('approval_signature_date', models.DateField(blank=True, null=True)),
                ('approval_ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('selected_bank_account_id', models.UUIDField(blank=True, null=True)),
                ('funding_initiated_at', models.DateTimeField(blank=True, null=True)),
                ('funding_completed_at', models.DateTimeField(blank=True, null=True)),
                ('distribution_started_at', models.DateTimeField(blank=True, null=True)),
                ('distribution_completed_at', models.DateTimeField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('approved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('payroll_run', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='stripe_payment', to='payroll.payrollrun')),
            ],
            options={
                'verbose_name': 'Payroll Stripe Payment',
                'verbose_name_plural': 'Payroll Stripe Payments',
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='EmployeePayoutRecord',
            fields=[
                ('tenant_id', models.UUIDField(blank=True, db_column='tenant_id', null=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('stripe_transfer_id', models.CharField(blank=True, max_length=100)),
                ('stripe_payout_id', models.CharField(blank=True, max_length=100)),
                ('payout_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('payout_status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('in_transit', 'In Transit'), ('paid', 'Paid'), ('failed', 'Failed'), ('canceled', 'Canceled')], default='pending', max_length=20)),
                ('initiated_at', models.DateTimeField(blank=True, null=True)),
                ('expected_arrival_date', models.DateField(blank=True, null=True)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('failure_code', models.CharField(blank=True, max_length=50)),
                ('failure_message', models.TextField(blank=True)),
                ('retry_count', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='hr.employee')),
                ('payroll_transaction', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='payout_record', to='payroll.payrolltransaction')),
            ],
            options={
                'verbose_name': 'Employee Payout Record',
                'verbose_name_plural': 'Employee Payout Records',
                'abstract': False,
            },
        ),
        # Update PayrollRun status field
        migrations.AlterField(
            model_name='payrollrun',
            name='status',
            field=models.CharField(choices=[('draft', 'Draft'), ('pending_approval', 'Pending Approval'), ('approved', 'Approved'), ('funding', 'Collecting Funds'), ('funded', 'Funds Collected'), ('distributing', 'Distributing'), ('completed', 'Completed'), ('failed', 'Failed'), ('cancelled', 'Cancelled')], default='draft', max_length=20),
        ),
    ]