# Generated manually to refactor Employee model

from django.db import migrations, models
import django.db.models.deletion
import phonenumber_field.modelfields
import uuid
from django.utils import timezone


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0012_accesspermission_tenant_id_benefits_tenant_id_and_more'),
        ('custom_auth', '0001_initial'),
    ]

    operations = [
        # 1. Rename the old employee table
        migrations.RunSQL(
            "ALTER TABLE hr_employee RENAME TO hr_employee_old;",
            reverse_sql="ALTER TABLE hr_employee_old RENAME TO hr_employee;"
        ),
        
        # 2. Create the new employee model
        migrations.CreateModel(
            name='Employee',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('employee_number', models.CharField(editable=False, max_length=20, unique=True)),
                ('business_id', models.UUIDField(db_index=True)),
                ('first_name', models.CharField(max_length=100)),
                ('middle_name', models.CharField(blank=True, max_length=100, null=True)),
                ('last_name', models.CharField(max_length=100)),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('phone_number', phonenumber_field.modelfields.PhoneNumberField(blank=True, max_length=128, null=True, region=None)),
                ('date_of_birth', models.DateField(blank=True, null=True)),
                ('gender', models.CharField(blank=True, choices=[('M', 'Male'), ('F', 'Female'), ('O', 'Other'), ('N', 'Prefer not to say')], max_length=1, null=True)),
                ('marital_status', models.CharField(blank=True, choices=[('S', 'Single'), ('M', 'Married'), ('D', 'Divorced'), ('W', 'Widowed')], max_length=1, null=True)),
                ('nationality', models.CharField(blank=True, max_length=100, null=True)),
                ('street', models.CharField(blank=True, max_length=200, null=True)),
                ('city', models.CharField(blank=True, max_length=100, null=True)),
                ('state', models.CharField(blank=True, max_length=2, null=True)),
                ('zip_code', models.CharField(blank=True, max_length=20, null=True)),
                ('country', models.CharField(default='US', max_length=100)),
                ('employment_type', models.CharField(choices=[('FT', 'Full-time'), ('PT', 'Part-time')], default='FT', max_length=2)),
                ('department', models.CharField(blank=True, max_length=100, null=True)),
                ('job_title', models.CharField(blank=True, max_length=100, null=True)),
                ('hire_date', models.DateField(default=timezone.now)),
                ('termination_date', models.DateField(blank=True, null=True)),
                ('active', models.BooleanField(default=True)),
                ('onboarded', models.BooleanField(default=False)),
                ('compensation_type', models.CharField(choices=[('SALARY', 'Salary (Yearly)'), ('WAGE', 'Wage (Hourly)')], default='SALARY', max_length=10)),
                ('salary', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('wage_per_hour', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('emergency_contact_name', models.CharField(blank=True, max_length=100, null=True)),
                ('emergency_contact_phone', models.CharField(blank=True, max_length=20, null=True)),
                ('security_number_type', models.CharField(choices=[('SSN', 'Social Security Number (US)'), ('EIN', 'Employer Identification Number'), ('ITIN', 'Individual Taxpayer ID Number'), ('SIN', 'Social Insurance Number (Canada)'), ('NIN', 'National Insurance Number (UK)'), ('TFN', 'Tax File Number (Australia)'), ('PAN', 'PAN Card Number (India)'), ('OTHER', 'Other National ID')], default='SSN', max_length=10)),
                ('ssn_last_four', models.CharField(blank=True, max_length=4, null=True)),
                ('stripe_person_id', models.CharField(blank=True, max_length=255, null=True)),
                ('stripe_account_id', models.CharField(blank=True, max_length=255, null=True)),
                ('ssn_stored_in_stripe', models.BooleanField(default=False)),
                ('direct_deposit', models.BooleanField(default=False)),
                ('vacation_time', models.BooleanField(default=False)),
                ('vacation_days_per_year', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('supervisor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='subordinates', to='hr.employee')),
                ('user', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='employee_profile', to='custom_auth.user')),
            ],
            options={
                'db_table': 'hr_employee_new',
                'ordering': ['last_name', 'first_name'],
            },
        ),
        
        # 3. Migrate data from old table to new table
        migrations.RunSQL(
            """
            INSERT INTO hr_employee_new (
                id, employee_number, business_id, first_name, middle_name, last_name,
                email, phone_number, date_of_birth, gender, marital_status, nationality,
                street, city, state, zip_code, country, employment_type, department,
                job_title, hire_date, termination_date, active, onboarded,
                compensation_type, salary, wage_per_hour, emergency_contact_name,
                emergency_contact_phone, security_number_type, ssn_last_four,
                stripe_person_id, stripe_account_id, ssn_stored_in_stripe,
                direct_deposit, vacation_time, vacation_days_per_year,
                created_at, updated_at, supervisor_id, user_id
            )
            SELECT 
                id, 
                COALESCE(employee_number, CONCAT('EMP-MIGRATED-', SUBSTRING(CAST(id AS TEXT), 1, 8))),
                business_id,
                COALESCE(first_name, ''),
                middle_name,
                COALESCE(last_name, ''),
                email,
                phone_number,
                CASE 
                    WHEN date_of_birth IS NOT NULL THEN date_of_birth
                    WHEN dob IS NOT NULL THEN dob
                    ELSE NULL
                END as date_of_birth,
                gender,
                marital_status,
                nationality,
                street,
                city,
                state,
                COALESCE(postcode, '') as zip_code,
                country,
                employment_type,
                department,
                job_title,
                COALESCE(date_joined, NOW()::date) as hire_date,
                termination_date,
                COALESCE(active, true) as active,
                COALESCE(onboarded, false) as onboarded,
                COALESCE(compensation_type, 'SALARY') as compensation_type,
                COALESCE(salary, 0) as salary,
                COALESCE(wage_per_hour, 0) as wage_per_hour,
                emergency_contact_name,
                emergency_contact_phone,
                COALESCE(security_number_type, 'SSN') as security_number_type,
                ssn_last_four,
                stripe_person_id,
                stripe_account_id,
                COALESCE(ssn_stored_in_stripe, false) as ssn_stored_in_stripe,
                COALESCE(direct_deposit, false) as direct_deposit,
                COALESCE(vacation_time, false) as vacation_time,
                COALESCE(vacation_days_per_year, 0) as vacation_days_per_year,
                NOW() as created_at,
                NOW() as updated_at,
                supervisor_id,
                user_id
            FROM hr_employee_old
            WHERE business_id IS NOT NULL;
            """,
            reverse_sql="DELETE FROM hr_employee_new;"
        ),
        
        # 4. Drop the old table
        migrations.RunSQL(
            "DROP TABLE hr_employee_old CASCADE;",
            reverse_sql="CREATE TABLE hr_employee_old (LIKE hr_employee_new INCLUDING ALL);"
        ),
        
        # 5. Rename new table to final name
        migrations.RunSQL(
            "ALTER TABLE hr_employee_new RENAME TO hr_employee;",
            reverse_sql="ALTER TABLE hr_employee RENAME TO hr_employee_new;"
        ),
        
        # 6. Add indexes after table is renamed
        migrations.AddIndex(
            model_name='employee',
            index=models.Index(fields=['business_id', 'active'], name='hr_employee_busines_5f3a12_idx'),
        ),
        migrations.AddIndex(
            model_name='employee',
            index=models.Index(fields=['email'], name='hr_employee_email_123456_idx'),
        ),
        migrations.AddIndex(
            model_name='employee',
            index=models.Index(fields=['employee_number'], name='hr_employee_employe_789012_idx'),
        ),
    ]