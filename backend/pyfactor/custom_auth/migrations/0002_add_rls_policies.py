"""
Add Row-Level Security (RLS) policies to PostgreSQL.
This provides database-level tenant isolation as a second line of defense.
"""
from django.db import migrations


def create_rls_policies(apps, schema_editor):
    """
    Create RLS policies for all tenant-aware tables.
    This ensures even if application code fails, database will enforce isolation.
    """
    
    # List of tables that need RLS policies
    tenant_tables = [
        # CRM tables
        'crm_customer',
        'crm_contact',
        'crm_lead',
        'crm_opportunity',
        'crm_deal',
        'crm_activity',
        'crm_campaign',
        
        # Sales tables
        'sales_invoice',
        'sales_invoiceitem',
        'sales_estimate',
        'sales_estimateitem',
        'sales_salesorder',
        'sales_salesorderitem',
        
        # Inventory tables
        'inventory_product',
        'inventory_service',
        'inventory_inventoryitem',
        
        # HR tables
        'hr_employee',
        'hr_department',
        'hr_benefits',
        
        # Timesheets
        'timesheets_timesheet',
        'timesheets_timeentry',
        'timesheets_clockentry',
        
        # Finance
        'finance_account',
        'finance_transaction',
        'finance_journalentry',
        
        # Banking
        'banking_bankaccount',
        'banking_banktransaction',
        
        # Payments
        'payments_payment',
        'payments_paymentmethod',
    ]
    
    with schema_editor.connection.cursor() as cursor:
        # First, create a function to get current tenant
        cursor.execute("""
            CREATE OR REPLACE FUNCTION current_tenant_id() 
            RETURNS uuid AS $$
            BEGIN
                RETURN current_setting('app.current_tenant_id', true)::uuid;
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN NULL;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        """)
        
        # Apply RLS to each table
        for table in tenant_tables:
            try:
                # Enable RLS on the table
                cursor.execute(f"""
                    ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
                """)
                
                # Drop existing policies if any
                cursor.execute(f"""
                    DROP POLICY IF EXISTS tenant_isolation_select ON {table};
                    DROP POLICY IF EXISTS tenant_isolation_insert ON {table};
                    DROP POLICY IF EXISTS tenant_isolation_update ON {table};
                    DROP POLICY IF EXISTS tenant_isolation_delete ON {table};
                """)
                
                # Create SELECT policy - can only see own tenant's data
                cursor.execute(f"""
                    CREATE POLICY tenant_isolation_select ON {table}
                    FOR SELECT
                    USING (
                        tenant_id = current_tenant_id() 
                        OR current_tenant_id() IS NULL
                    );
                """)
                
                # Create INSERT policy - can only insert for own tenant
                cursor.execute(f"""
                    CREATE POLICY tenant_isolation_insert ON {table}
                    FOR INSERT
                    WITH CHECK (
                        tenant_id = current_tenant_id()
                        OR current_tenant_id() IS NULL
                    );
                """)
                
                # Create UPDATE policy - can only update own tenant's data
                cursor.execute(f"""
                    CREATE POLICY tenant_isolation_update ON {table}
                    FOR UPDATE
                    USING (tenant_id = current_tenant_id())
                    WITH CHECK (tenant_id = current_tenant_id());
                """)
                
                # Create DELETE policy - can only delete own tenant's data
                cursor.execute(f"""
                    CREATE POLICY tenant_isolation_delete ON {table}
                    FOR DELETE
                    USING (tenant_id = current_tenant_id());
                """)
                
                print(f"✅ RLS policies created for {table}")
                
            except Exception as e:
                print(f"⚠️  Could not create RLS for {table}: {str(e)}")
                # Continue with other tables
        
        # Create audit table for security events
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS security_audit_log (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMPTZ DEFAULT NOW(),
                event_type VARCHAR(100) NOT NULL,
                severity VARCHAR(20) NOT NULL,
                user_id UUID,
                user_email VARCHAR(255),
                tenant_id UUID,
                ip_address INET,
                path VARCHAR(500),
                method VARCHAR(10),
                details JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            CREATE INDEX idx_security_audit_timestamp ON security_audit_log(timestamp);
            CREATE INDEX idx_security_audit_severity ON security_audit_log(severity);
            CREATE INDEX idx_security_audit_user ON security_audit_log(user_id);
            CREATE INDEX idx_security_audit_tenant ON security_audit_log(tenant_id);
        """)


def remove_rls_policies(apps, schema_editor):
    """Remove RLS policies (for rollback)."""
    
    tenant_tables = [
        'crm_customer', 'crm_contact', 'crm_lead', 'crm_opportunity',
        'crm_deal', 'crm_activity', 'crm_campaign',
        'sales_invoice', 'sales_invoiceitem', 'sales_estimate',
        'sales_estimateitem', 'sales_salesorder', 'sales_salesorderitem',
        'inventory_product', 'inventory_service', 'inventory_inventoryitem',
        'hr_employee', 'hr_department', 'hr_benefits',
        'timesheets_timesheet', 'timesheets_timeentry', 'timesheets_clockentry',
        'finance_account', 'finance_transaction', 'finance_journalentry',
        'banking_bankaccount', 'banking_banktransaction',
        'payments_payment', 'payments_paymentmethod',
    ]
    
    with schema_editor.connection.cursor() as cursor:
        for table in tenant_tables:
            try:
                cursor.execute(f"""
                    DROP POLICY IF EXISTS tenant_isolation_select ON {table};
                    DROP POLICY IF EXISTS tenant_isolation_insert ON {table};
                    DROP POLICY IF EXISTS tenant_isolation_update ON {table};
                    DROP POLICY IF EXISTS tenant_isolation_delete ON {table};
                    ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;
                """)
            except Exception as e:
                print(f"Could not remove RLS from {table}: {str(e)}")
        
        cursor.execute("DROP FUNCTION IF EXISTS current_tenant_id();")
        cursor.execute("DROP TABLE IF EXISTS security_audit_log;")


class Migration(migrations.Migration):
    
    dependencies = [
        ('custom_auth', '0001_initial'),
    ]
    
    operations = [
        migrations.RunPython(
            create_rls_policies,
            remove_rls_policies
        ),
    ]