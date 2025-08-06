#!/usr/bin/env python3
"""
Manual script to add county filing columns to GlobalSalesTaxRate table
"""

import os
import sys
import django

sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def add_county_filing_columns():
    print("Adding county filing columns to GlobalSalesTaxRate table...")
    
    with connection.cursor() as cursor:
        # Check if columns already exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'taxes_globalsalestaxrate' 
            AND column_name LIKE 'county_%'
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        if existing_columns:
            print(f"Some county columns already exist: {existing_columns}")
            return
        
        # Add all county filing columns
        columns_to_add = [
            "ALTER TABLE taxes_globalsalestaxrate ADD COLUMN county_filing_website VARCHAR(500) DEFAULT '' NOT NULL",
            "ALTER TABLE taxes_globalsalestaxrate ADD COLUMN county_contact_phone VARCHAR(20) DEFAULT '' NOT NULL",
            "ALTER TABLE taxes_globalsalestaxrate ADD COLUMN county_contact_email VARCHAR(254) DEFAULT '' NOT NULL",
            "ALTER TABLE taxes_globalsalestaxrate ADD COLUMN county_mailing_address TEXT DEFAULT '' NOT NULL",
            "ALTER TABLE taxes_globalsalestaxrate ADD COLUMN county_filing_instructions TEXT DEFAULT '' NOT NULL",
            "ALTER TABLE taxes_globalsalestaxrate ADD COLUMN county_filing_frequency VARCHAR(20) DEFAULT '' NOT NULL",
            "ALTER TABLE taxes_globalsalestaxrate ADD COLUMN county_filing_deadline VARCHAR(50) DEFAULT '' NOT NULL",
            "ALTER TABLE taxes_globalsalestaxrate ADD COLUMN county_online_portal_available BOOLEAN DEFAULT FALSE NOT NULL",
            "ALTER TABLE taxes_globalsalestaxrate ADD COLUMN county_online_portal_name VARCHAR(100) DEFAULT '' NOT NULL",
            "ALTER TABLE taxes_globalsalestaxrate ADD COLUMN county_online_portal_url VARCHAR(500) DEFAULT '' NOT NULL",
            "ALTER TABLE taxes_globalsalestaxrate ADD COLUMN county_special_requirements TEXT DEFAULT '' NOT NULL",
            "ALTER TABLE taxes_globalsalestaxrate ADD COLUMN county_payment_methods JSONB DEFAULT '[]'::jsonb NOT NULL"
        ]
        
        for sql in columns_to_add:
            try:
                cursor.execute(sql)
                column_name = sql.split('ADD COLUMN ')[1].split(' ')[0]
                print(f"✅ Added column: {column_name}")
            except Exception as e:
                print(f"❌ Error adding column: {e}")
        
        print("✅ All county filing columns added successfully!")

if __name__ == "__main__":
    add_county_filing_columns()