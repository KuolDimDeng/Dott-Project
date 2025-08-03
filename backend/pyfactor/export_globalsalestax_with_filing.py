#!/usr/bin/env python3
"""
Export GlobalSalesTaxRate table to JSON with all filing fields
"""

import os
import json
import django
from decimal import Decimal
from datetime import datetime, date

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from taxes.models import GlobalSalesTaxRate

def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return obj

def export_with_raw_sql():
    """Export all GlobalSalesTaxRate records using raw SQL"""
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT 
                id,
                country,
                country_name,
                region_code,
                region_name,
                locality,
                tax_type,
                rate,
                effective_date,
                end_date,
                is_current,
                ai_populated,
                ai_confidence_score,
                ai_source_notes,
                ai_last_verified,
                created_at,
                updated_at,
                manually_verified,
                manual_notes,
                tax_authority_name,
                filing_frequency,
                filing_day_of_month,
                online_filing_available,
                online_portal_name,
                online_portal_url,
                main_form_name,
                filing_instructions,
                manual_filing_fee,
                online_filing_fee
            FROM taxes_globalsalestaxrate 
            ORDER BY country, region_name, locality
        """)
        
        columns = [desc[0] for desc in cursor.description]
        records = []
        
        for row in cursor.fetchall():
            record = {}
            for i, value in enumerate(row):
                record[columns[i]] = decimal_to_float(value)
            records.append(record)
    
    return records

def main():
    print("Starting export of GlobalSalesTaxRate table with filing fields...")
    
    # Export using raw SQL
    records = export_with_raw_sql()
    
    print(f"✅ Found {len(records)} records")
    
    # Export to JSON file
    output_file = '/Users/kuoldeng/projectx/backend/pyfactor/globalsalestax_export_with_filing.json'
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Exported to: {output_file}")
    
    # Print summary statistics
    print("\n📊 Export Summary:")
    print(f"   Total records: {len(records)}")
    
    # Count records by type
    countries = set()
    regions = set()
    localities = set()
    tax_types = set()
    filing_frequencies = set()
    
    with_filing_info = 0
    with_online_filing = 0
    
    for record in records:
        if record['country']:
            countries.add(record['country'])
        if record['region_name']:
            regions.add(record['region_name'])
        if record['locality']:
            localities.add(record['locality'])
        if record['tax_type']:
            tax_types.add(record['tax_type'])
        if record['filing_frequency']:
            filing_frequencies.add(record['filing_frequency'])
            with_filing_info += 1
        if record['online_filing_available']:
            with_online_filing += 1
    
    print(f"   Countries: {len(countries)}")
    print(f"   Regions: {len(regions)}")
    print(f"   Localities: {len(localities)}")
    print(f"   Tax types: {list(tax_types)}")
    print(f"   Filing frequencies: {list(filing_frequencies)}")
    print(f"   Records with filing info: {with_filing_info}")
    print(f"   Records with online filing: {with_online_filing}")
    
    # Show sample filing fields from first few records
    print("\n📋 Sample Filing Information:")
    for i, record in enumerate(records[:3]):
        if record['filing_frequency']:
            print(f"   Record {i+1}: {record['country_name']} - {record['region_name']}")
            print(f"      Filing Frequency: {record['filing_frequency']}")
            print(f"      Tax Authority: {record['tax_authority_name']}")
            print(f"      Online Filing: {record['online_filing_available']}")
            print(f"      Online Portal: {record['online_portal_name']}")
            print(f"      Main Form: {record['main_form_name']}")
            break
    
    print(f"\n✨ Export complete! File size: {os.path.getsize(output_file)} bytes")

if __name__ == "__main__":
    main()