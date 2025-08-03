#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

# SQL to create the GlobalPayrollTax table
create_table_sql = """
CREATE TABLE IF NOT EXISTS taxes_globalpayrolltax (
    id SERIAL PRIMARY KEY,
    country VARCHAR(2) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    region_code VARCHAR(10) DEFAULT '',
    region_name VARCHAR(100) DEFAULT '',
    employee_social_security_rate DECIMAL(6,4) DEFAULT 0,
    employee_medicare_rate DECIMAL(6,4) DEFAULT 0,
    employee_unemployment_rate DECIMAL(6,4) DEFAULT 0,
    employee_other_rate DECIMAL(6,4) DEFAULT 0,
    employer_social_security_rate DECIMAL(6,4) DEFAULT 0,
    employer_medicare_rate DECIMAL(6,4) DEFAULT 0,
    employer_unemployment_rate DECIMAL(6,4) DEFAULT 0,
    employer_other_rate DECIMAL(6,4) DEFAULT 0,
    social_security_wage_cap DECIMAL(12,2),
    medicare_additional_threshold DECIMAL(12,2),
    medicare_additional_rate DECIMAL(6,4) DEFAULT 0,
    tax_authority_name VARCHAR(200) DEFAULT '',
    filing_frequency VARCHAR(20) DEFAULT 'monthly',
    deposit_schedule VARCHAR(20) DEFAULT 'monthly',
    filing_day_of_month INTEGER,
    quarter_end_filing_days INTEGER DEFAULT 30,
    year_end_filing_days INTEGER DEFAULT 31,
    online_filing_available BOOLEAN DEFAULT FALSE,
    online_portal_name VARCHAR(100) DEFAULT '',
    online_portal_url VARCHAR(500) DEFAULT '',
    employee_tax_form VARCHAR(50) DEFAULT '',
    employer_return_form VARCHAR(50) DEFAULT '',
    year_end_employee_form VARCHAR(50) DEFAULT '',
    has_state_taxes BOOLEAN DEFAULT FALSE,
    has_local_taxes BOOLEAN DEFAULT FALSE,
    requires_registration BOOLEAN DEFAULT TRUE,
    registration_info TEXT DEFAULT '',
    ai_populated BOOLEAN DEFAULT TRUE,
    ai_confidence_score DECIMAL(3,2),
    ai_source_notes TEXT DEFAULT '',
    ai_last_verified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    effective_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    manually_verified BOOLEAN DEFAULT FALSE,
    manual_notes TEXT DEFAULT '',
    manual_filing_fee DECIMAL(6,2) DEFAULT 65.00,
    assisted_filing_fee DECIMAL(6,2) DEFAULT 125.00,
    filing_instructions TEXT DEFAULT '',
    common_mistakes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_globalpayrolltax_country_current ON taxes_globalpayrolltax(country, is_current);
CREATE INDEX IF NOT EXISTS idx_globalpayrolltax_country_region_current ON taxes_globalpayrolltax(country, region_code, is_current);
"""

# SQL to add payroll tax fields to TenantTaxSettings
alter_table_sql = """
ALTER TABLE taxes_tenanttaxsettings 
ADD COLUMN IF NOT EXISTS payroll_tax_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS override_employee_social_security_rate DECIMAL(6,4),
ADD COLUMN IF NOT EXISTS override_employee_medicare_rate DECIMAL(6,4),
ADD COLUMN IF NOT EXISTS override_employee_unemployment_rate DECIMAL(6,4),
ADD COLUMN IF NOT EXISTS override_employer_social_security_rate DECIMAL(6,4),
ADD COLUMN IF NOT EXISTS override_employer_medicare_rate DECIMAL(6,4),
ADD COLUMN IF NOT EXISTS override_employer_unemployment_rate DECIMAL(6,4),
ADD COLUMN IF NOT EXISTS payroll_tax_registration_number VARCHAR(100) DEFAULT '',
ADD COLUMN IF NOT EXISTS payroll_filing_frequency VARCHAR(20) DEFAULT '';
"""

# Execute the SQL
with connection.cursor() as cursor:
    print("Creating GlobalPayrollTax table...")
    cursor.execute(create_table_sql)
    print("✅ GlobalPayrollTax table created successfully!")
    
    print("\nAdding payroll tax fields to TenantTaxSettings...")
    cursor.execute(alter_table_sql)
    print("✅ TenantTaxSettings updated successfully!")
    
    # Insert migration record
    cursor.execute("""
        INSERT INTO django_migrations (app, name, applied) 
        VALUES ('taxes', '0019_add_global_payroll_tax', NOW())
        ON CONFLICT DO NOTHING;
    """)
    
print("\n✅ Database setup complete!")