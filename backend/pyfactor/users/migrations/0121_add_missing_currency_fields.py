# Generated manually to ensure currency fields exist
from django.db import migrations

def add_currency_fields_if_missing(apps, schema_editor):
    """Add missing currency fields to BusinessDetails table if they don't exist"""
    from django.db import connection
    
    with connection.cursor() as cursor:
        # Check if the preferred_currency_symbol column exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users_business_details' 
            AND column_name = 'preferred_currency_symbol';
        """)
        
        if not cursor.fetchone():
            # Add the missing column
            cursor.execute("""
                ALTER TABLE users_business_details 
                ADD COLUMN preferred_currency_symbol VARCHAR(10) DEFAULT '$';
            """)
            print("✅ Added preferred_currency_symbol column")
        
        # Check other currency fields
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users_business_details' 
            AND column_name = 'currency_updated_at';
        """)
        
        if not cursor.fetchone():
            cursor.execute("""
                ALTER TABLE users_business_details 
                ADD COLUMN currency_updated_at TIMESTAMP WITH TIME ZONE NULL;
            """)
            print("✅ Added currency_updated_at column")
        
        # Check accounting fields
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users_business_details' 
            AND column_name = 'accounting_standard';
        """)
        
        if not cursor.fetchone():
            cursor.execute("""
                ALTER TABLE users_business_details 
                ADD COLUMN accounting_standard VARCHAR(10) DEFAULT 'IFRS';
            """)
            print("✅ Added accounting_standard column")
            
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users_business_details' 
            AND column_name = 'accounting_standard_updated_at';
        """)
        
        if not cursor.fetchone():
            cursor.execute("""
                ALTER TABLE users_business_details 
                ADD COLUMN accounting_standard_updated_at TIMESTAMP WITH TIME ZONE NULL;
            """)
            print("✅ Added accounting_standard_updated_at column")

def reverse_currency_fields(apps, schema_editor):
    """Reverse migration - we don't want to drop columns"""
    pass

class Migration(migrations.Migration):
    
    dependencies = [
        ('users', '0027_add_county_field'),  # Last migration that exists in production
    ]
    
    operations = [
        migrations.RunPython(
            add_currency_fields_if_missing,
            reverse_currency_fields
        ),
    ]