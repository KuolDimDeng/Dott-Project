from django.db import migrations

def setup_rls_forward(apps, schema_editor):
    """
    Set up Row Level Security (RLS) on tenant tables.
    """
    # Skip migration in test environment
    if schema_editor.connection.alias == 'default' and schema_editor.connection.vendor == 'postgresql':
        # List of tenant tables
        tenant_tables = [
            'banking_bankaccount',
            'banking_banktransaction',
            'banking_plaiditem',
            'banking_tinkitem',
            'finance_account',
            'finance_accountreconciliation',
            'finance_transaction',
            'inventory_product',
            'inventory_inventoryitem',
            'sales_invoice',
            'sales_sale',
            'purchases_bill',
            'purchases_vendor',
            'crm_customer',
            'crm_lead',
        ]
        
        # Create session variable for current tenant
        schema_editor.execute(
            "DO $$"
            "BEGIN"
            "  EXECUTE 'ALTER DATABASE ' || current_database() || ' SET app.current_tenant_id = ''unset'''; "
            "END$$;"
        )
        
        # Execute SQL to set up RLS on tenant tables
        for table in tenant_tables:
            # Enable RLS on the table
            schema_editor.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;')
            
            # Create policy for tenant isolation
            schema_editor.execute(
                f"CREATE POLICY tenant_isolation_policy ON {table} "
                f"FOR ALL "
                f"USING (tenant_id::text = current_setting('app.current_tenant_id', true));"
            )
            
            # Create policy for admin access
            schema_editor.execute(
                f"CREATE POLICY admin_access_policy ON {table} "
                f"FOR ALL "
                f"TO admin "
                f"USING (true);"
            )

def setup_rls_backward(apps, schema_editor):
    """
    Remove Row Level Security from tenant tables.
    """
    if schema_editor.connection.alias == 'default' and schema_editor.connection.vendor == 'postgresql':
        # List of tenant tables
        tenant_tables = [
            'banking_bankaccount',
            'banking_banktransaction',
            'banking_plaiditem',
            'banking_tinkitem',
            'finance_account',
            'finance_accountreconciliation',
            'finance_transaction',
            'inventory_product',
            'inventory_inventoryitem',
            'sales_invoice',
            'sales_sale',
            'purchases_bill',
            'purchases_vendor',
            'crm_customer',
            'crm_lead',
        ]
        
        # Remove RLS from tables
        for table in tenant_tables:
            try:
                # Drop policies
                schema_editor.execute(f'DROP POLICY IF EXISTS tenant_isolation_policy ON {table};')
                schema_editor.execute(f'DROP POLICY IF EXISTS admin_access_policy ON {table};')
                
                # Disable RLS
                schema_editor.execute(f'ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;')
            except Exception:
                # Continue if table doesn't exist
                pass

class Migration(migrations.Migration):
    dependencies = [
        ('custom_auth', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(setup_rls_forward, setup_rls_backward),
    ] 