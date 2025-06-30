# Generated migration for payroll tax models

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('taxes', '0008_populate_efiling_data'),
    ]

    operations = [
        migrations.CreateModel(
            name='Form941',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=255)),
                ('quarter', models.IntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(4)])),
                ('year', models.IntegerField()),
                ('period_start', models.DateField()),
                ('period_end', models.DateField()),
                ('due_date', models.DateField()),
                ('filing_date', models.DateTimeField(blank=True, null=True)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('calculated', 'Calculated'), ('ready', 'Ready to File'), ('submitted', 'Submitted'), ('accepted', 'Accepted'), ('rejected', 'Rejected'), ('amended', 'Amended')], default='draft', max_length=20)),
                ('number_of_employees', models.IntegerField(default=0, help_text='Number of employees who received wages')),
                ('wages_tips_compensation', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('federal_income_tax_withheld', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('social_security_wages', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('social_security_tips', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('social_security_tax', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('medicare_wages_tips', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('medicare_tax', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('additional_medicare_tax', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('total_tax_before_adjustments', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('current_quarter_adjustments', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('total_tax_after_adjustments', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('deposit_schedule', models.CharField(choices=[('monthly', 'Monthly'), ('semiweekly', 'Semiweekly')], default='monthly', max_length=20)),
                ('month1_liability', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('month2_liability', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('month3_liability', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('total_deposits', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('balance_due', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('overpayment', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('requires_schedule_b', models.BooleanField(default=False)),
                ('schedule_b_data', models.JSONField(blank=True, default=dict)),
                ('business_closed', models.BooleanField(default=False)),
                ('final_return', models.BooleanField(default=False)),
                ('seasonal_employer', models.BooleanField(default=False)),
                ('submission_id', models.CharField(blank=True, max_length=100, null=True)),
                ('irs_tracking_number', models.CharField(blank=True, max_length=100, null=True)),
                ('acknowledgment_number', models.CharField(blank=True, max_length=100, null=True)),
                ('acknowledgment_date', models.DateTimeField(blank=True, null=True)),
                ('validation_errors', models.JSONField(blank=True, default=list)),
                ('is_valid', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.EmailField(max_length=254)),
            ],
            options={
                'db_table': 'tax_form_941',
                'unique_together': {('tenant_id', 'quarter', 'year')},
                'indexes': [
                    models.Index(fields=['tenant_id', 'year', 'quarter'], name='tax_form_94_tenant__d8e0d7_idx'),
                    models.Index(fields=['status', 'due_date'], name='tax_form_94_status_d8a6f0_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='Form941ScheduleB',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=255)),
                ('daily_liabilities', models.JSONField(default=dict)),
                ('month1_total', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('month2_total', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('month3_total', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('quarter_total', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('form_941', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='schedule_b', to='taxes.form941')),
            ],
            options={
                'db_table': 'tax_form_941_schedule_b',
            },
        ),
        migrations.CreateModel(
            name='PayrollTaxDeposit',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=255)),
                ('payroll_run_id', models.CharField(db_index=True, max_length=50)),
                ('pay_date', models.DateField()),
                ('deposit_date', models.DateField()),
                ('due_date', models.DateField()),
                ('federal_income_tax', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('social_security_tax', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('medicare_tax', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('total_deposit', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('status', models.CharField(choices=[('scheduled', 'Scheduled'), ('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed')], default='scheduled', max_length=20)),
                ('payment_method', models.CharField(blank=True, max_length=50, null=True)),
                ('confirmation_number', models.CharField(blank=True, max_length=100, null=True)),
                ('eftps_acknowledgment', models.CharField(blank=True, max_length=100, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'tax_payroll_deposits',
                'indexes': [
                    models.Index(fields=['tenant_id', 'deposit_date'], name='tax_payroll_tenant__d8e0d7_idx'),
                    models.Index(fields=['status', 'due_date'], name='tax_payroll_status_d8a6f0_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='PayrollTaxFilingSchedule',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=255)),
                ('form_type', models.CharField(choices=[('941', 'Form 941 - Quarterly'), ('940', 'Form 940 - Annual FUTA'), ('W2', 'Form W-2 - Annual'), ('1099', 'Form 1099 - Annual'), ('STATE_QUARTERLY', 'State Quarterly'), ('STATE_ANNUAL', 'State Annual')], max_length=20)),
                ('year', models.IntegerField()),
                ('quarter', models.IntegerField(blank=True, null=True)),
                ('period_start', models.DateField()),
                ('period_end', models.DateField()),
                ('filing_deadline', models.DateField()),
                ('extended_deadline', models.DateField(blank=True, null=True)),
                ('status', models.CharField(choices=[('upcoming', 'Upcoming'), ('in_progress', 'In Progress'), ('filed', 'Filed'), ('late', 'Late'), ('extended', 'Extended')], default='upcoming', max_length=20)),
                ('filed_date', models.DateTimeField(blank=True, null=True)),
                ('confirmation_number', models.CharField(blank=True, max_length=100, null=True)),
                ('reminder_sent', models.BooleanField(default=False)),
                ('reminder_date', models.DateTimeField(blank=True, null=True)),
                ('state_code', models.CharField(blank=True, max_length=2, null=True)),
            ],
            options={
                'db_table': 'tax_payroll_filing_schedule',
                'unique_together': {('tenant_id', 'form_type', 'year', 'quarter', 'state_code')},
                'indexes': [
                    models.Index(fields=['tenant_id', 'filing_deadline'], name='tax_payroll_tenant__f8e0d7_idx'),
                    models.Index(fields=['status', 'filing_deadline'], name='tax_payroll_status_f8a6f0_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='EmployerTaxAccount',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.CharField(db_index=True, max_length=255)),
                ('ein', models.CharField(help_text='Employer Identification Number', max_length=20)),
                ('ein_verified', models.BooleanField(default=False)),
                ('eftps_enrolled', models.BooleanField(default=False)),
                ('eftps_pin', models.CharField(blank=True, help_text='Encrypted PIN', max_length=100)),
                ('state_accounts', models.JSONField(blank=True, default=dict)),
                ('federal_deposit_schedule', models.CharField(choices=[('monthly', 'Monthly'), ('semiweekly', 'Semiweekly'), ('next_day', 'Next Day')], default='monthly', max_length=20)),
                ('previous_year_liability', models.DecimalField(blank=True, decimal_places=2, help_text='Total tax liability for previous year', max_digits=12, null=True)),
                ('tax_contact_name', models.CharField(blank=True, max_length=100)),
                ('tax_contact_email', models.EmailField(blank=True, max_length=254)),
                ('tax_contact_phone', models.CharField(blank=True, max_length=20)),
                ('has_poa', models.BooleanField(default=False)),
                ('poa_firm_name', models.CharField(blank=True, max_length=200)),
                ('poa_caf_number', models.CharField(blank=True, max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'tax_employer_accounts',
            },
        ),
    ]