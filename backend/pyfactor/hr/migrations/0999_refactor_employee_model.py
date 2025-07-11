# Simple migration to refactor Employee model without indexes
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
        # 1. Create the new employee model with a temporary table name
        migrations.RunSQL(
            """
            CREATE TABLE IF NOT EXISTS hr_employee_temp (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                employee_number VARCHAR(20) UNIQUE NOT NULL,
                business_id UUID NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                middle_name VARCHAR(100),
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(254) UNIQUE NOT NULL,
                phone_number VARCHAR(128),
                date_of_birth DATE,
                gender VARCHAR(1),
                marital_status VARCHAR(1),
                nationality VARCHAR(100),
                street VARCHAR(200),
                city VARCHAR(100),
                state VARCHAR(2),
                zip_code VARCHAR(20),
                country VARCHAR(100) DEFAULT 'US',
                employment_type VARCHAR(2) DEFAULT 'FT',
                department VARCHAR(100),
                job_title VARCHAR(100),
                hire_date DATE DEFAULT CURRENT_DATE,
                termination_date DATE,
                active BOOLEAN DEFAULT true,
                onboarded BOOLEAN DEFAULT false,
                compensation_type VARCHAR(10) DEFAULT 'SALARY',
                salary DECIMAL(10,2) DEFAULT 0,
                wage_per_hour DECIMAL(6,2) DEFAULT 0,
                emergency_contact_name VARCHAR(100),
                emergency_contact_phone VARCHAR(20),
                security_number_type VARCHAR(10) DEFAULT 'SSN',
                ssn_last_four VARCHAR(4),
                stripe_person_id VARCHAR(255),
                stripe_account_id VARCHAR(255),
                ssn_stored_in_stripe BOOLEAN DEFAULT false,
                direct_deposit BOOLEAN DEFAULT false,
                vacation_time BOOLEAN DEFAULT false,
                vacation_days_per_year INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                supervisor_id UUID,
                user_id INTEGER UNIQUE
            );
            """,
            reverse_sql="DROP TABLE IF EXISTS hr_employee_temp;"
        ),
        
        # 2. Copy data from existing employee table to temp table
        migrations.RunSQL(
            """
            INSERT INTO hr_employee_temp (
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
                COALESCE(employee_number, CONCAT('EMP-', SUBSTRING(id::text, 1, 8))),
                business_id,
                COALESCE(first_name, ''),
                middle_name,
                COALESCE(last_name, ''),
                email,
                phone_number,
                COALESCE(date_of_birth, dob),
                gender,
                marital_status,
                nationality,
                street,
                city,
                state,
                COALESCE(postcode, ''),
                country,
                employment_type,
                department,
                job_title,
                COALESCE(date_joined, CURRENT_DATE),
                termination_date,
                COALESCE(active, true),
                COALESCE(onboarded, false),
                COALESCE(compensation_type, 'SALARY'),
                COALESCE(salary, 0),
                COALESCE(wage_per_hour, 0),
                emergency_contact_name,
                emergency_contact_phone,
                COALESCE(security_number_type, 'SSN'),
                ssn_last_four,
                stripe_person_id,
                stripe_account_id,
                COALESCE(ssn_stored_in_stripe, false),
                COALESCE(direct_deposit, false),
                COALESCE(vacation_time, false),
                COALESCE(vacation_days_per_year, 0),
                NOW(),
                NOW(),
                supervisor_id,
                user_id
            FROM hr_employee
            WHERE business_id IS NOT NULL;
            """,
            reverse_sql="DELETE FROM hr_employee_temp;"
        ),
        
        # 3. Drop the old employee table
        migrations.RunSQL(
            "DROP TABLE IF EXISTS hr_employee CASCADE;",
            reverse_sql="CREATE TABLE hr_employee (LIKE hr_employee_temp INCLUDING ALL);"
        ),
        
        # 4. Rename temp table to final name
        migrations.RunSQL(
            "ALTER TABLE hr_employee_temp RENAME TO hr_employee;",
            reverse_sql="ALTER TABLE hr_employee RENAME TO hr_employee_temp;"
        ),
        
        # 5. Create indexes
        migrations.RunSQL(
            """
            CREATE INDEX IF NOT EXISTS hr_employee_business_active_idx ON hr_employee(business_id, active);
            CREATE INDEX IF NOT EXISTS hr_employee_email_idx ON hr_employee(email);
            CREATE INDEX IF NOT EXISTS hr_employee_employee_number_idx ON hr_employee(employee_number);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS hr_employee_business_active_idx;
            DROP INDEX IF EXISTS hr_employee_email_idx;
            DROP INDEX IF EXISTS hr_employee_employee_number_idx;
            """
        ),
        
        # 6. Add foreign key constraints
        migrations.RunSQL(
            """
            ALTER TABLE hr_employee 
            ADD CONSTRAINT hr_employee_supervisor_fk 
            FOREIGN KEY (supervisor_id) REFERENCES hr_employee(id) ON DELETE SET NULL;
            
            ALTER TABLE hr_employee 
            ADD CONSTRAINT hr_employee_user_fk 
            FOREIGN KEY (user_id) REFERENCES custom_auth_user(id) ON DELETE SET NULL;
            """,
            reverse_sql="""
            ALTER TABLE hr_employee DROP CONSTRAINT IF EXISTS hr_employee_supervisor_fk;
            ALTER TABLE hr_employee DROP CONSTRAINT IF EXISTS hr_employee_user_fk;
            """
        ),
    ]