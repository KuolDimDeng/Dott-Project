"""
Industry-standard migration to ensure tenant_id and business_id columns exist.
Uses RunSQL for idempotent operations that won't fail if columns already exist.
"""

from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0012_ensure_journalentryline_tenant_id'),
    ]

    operations = [
        # Use RunSQL for idempotent column additions
        migrations.RunSQL(
            sql="""
            -- Add tenant_id to tables if missing
            DO $$ 
            BEGIN
                BEGIN
                    ALTER TABLE finance_journalentryline ADD COLUMN tenant_id uuid;
                EXCEPTION
                    WHEN duplicate_column THEN NULL;
                END;
                
                BEGIN
                    ALTER TABLE finance_journalentry ADD COLUMN tenant_id uuid;
                EXCEPTION
                    WHEN duplicate_column THEN NULL;
                END;
                
                BEGIN
                    ALTER TABLE finance_generalledgerentry ADD COLUMN tenant_id uuid;
                EXCEPTION
                    WHEN duplicate_column THEN NULL;
                END;
                
                BEGIN
                    ALTER TABLE finance_chartofaccount ADD COLUMN tenant_id uuid;
                EXCEPTION
                    WHEN duplicate_column THEN NULL;
                END;
                
                -- Add business_id to tables if missing
                BEGIN
                    ALTER TABLE finance_journalentryline ADD COLUMN business_id uuid;
                EXCEPTION
                    WHEN duplicate_column THEN NULL;
                END;
                
                BEGIN
                    ALTER TABLE finance_journalentry ADD COLUMN business_id uuid;
                EXCEPTION
                    WHEN duplicate_column THEN NULL;
                END;
                
                BEGIN
                    ALTER TABLE finance_generalledgerentry ADD COLUMN business_id uuid;
                EXCEPTION
                    WHEN duplicate_column THEN NULL;
                END;
                
                BEGIN
                    ALTER TABLE finance_chartofaccount ADD COLUMN business_id uuid;
                EXCEPTION
                    WHEN duplicate_column THEN NULL;
                END;
            END $$;
            
            -- Update business_id from tenant_id where needed
            UPDATE finance_journalentryline 
            SET business_id = tenant_id 
            WHERE business_id IS NULL AND tenant_id IS NOT NULL;
            
            UPDATE finance_journalentry 
            SET business_id = tenant_id 
            WHERE business_id IS NULL AND tenant_id IS NOT NULL;
            
            UPDATE finance_generalledgerentry 
            SET business_id = tenant_id 
            WHERE business_id IS NULL AND tenant_id IS NOT NULL;
            
            UPDATE finance_chartofaccount 
            SET business_id = tenant_id 
            WHERE business_id IS NULL AND tenant_id IS NOT NULL;
            
            -- Create indexes if they don't exist
            CREATE INDEX IF NOT EXISTS idx_finance_journalentryline_tenant 
            ON finance_journalentryline(tenant_id);
            
            CREATE INDEX IF NOT EXISTS idx_finance_journalentryline_business 
            ON finance_journalentryline(business_id);
            
            CREATE INDEX IF NOT EXISTS idx_finance_journalentry_tenant 
            ON finance_journalentry(tenant_id);
            
            CREATE INDEX IF NOT EXISTS idx_finance_journalentry_business 
            ON finance_journalentry(business_id);
            
            CREATE INDEX IF NOT EXISTS idx_finance_generalledgerentry_tenant 
            ON finance_generalledgerentry(tenant_id);
            
            CREATE INDEX IF NOT EXISTS idx_finance_generalledgerentry_business 
            ON finance_generalledgerentry(business_id);
            
            CREATE INDEX IF NOT EXISTS idx_finance_chartofaccount_tenant 
            ON finance_chartofaccount(tenant_id);
            
            CREATE INDEX IF NOT EXISTS idx_finance_chartofaccount_business 
            ON finance_chartofaccount(business_id);
            """,
            reverse_sql="""
            -- We don't remove these columns on reverse
            -- They are critical for the application
            SELECT 1;
            """,
        ),
    ]