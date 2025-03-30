from django.db import migrations

def create_views_forward(apps, schema_editor):
    """
    Create database views for tenant-aware reporting.
    """
    # Skip if not using PostgreSQL
    if schema_editor.connection.vendor != 'postgresql':
        return
        
    # Create view for banking accounts
    schema_editor.execute('''
    CREATE OR REPLACE VIEW banking_account_view AS
    SELECT
        ba.id,
        ba.name,
        ba.account_number,
        ba.account_type,
        ba.balance,
        ba.currency,
        ba.is_active,
        ba.created_at,
        ba.updated_at,
        ba.tenant_id,
        u.email as user_email,
        t.name as tenant_name
    FROM
        banking_bankaccount ba
    LEFT JOIN
        custom_auth_user u ON ba.user_id = u.id
    LEFT JOIN
        custom_auth_tenant t ON ba.tenant_id = t.id
    WHERE
        ba.tenant_id::text = current_setting('app.current_tenant_id', true)
        OR current_setting('app.current_tenant_id', true) = 'unset';
    ''')
    
    # Create view for bank transactions
    schema_editor.execute('''
    CREATE OR REPLACE VIEW banking_transaction_view AS
    SELECT
        bt.id,
        bt.amount,
        bt.description,
        bt.transaction_date,
        bt.transaction_type,
        bt.category,
        bt.reference,
        bt.created_at,
        bt.updated_at,
        bt.tenant_id,
        ba.name as account_name,
        ba.account_number
    FROM
        banking_banktransaction bt
    JOIN
        banking_bankaccount ba ON bt.account_id = ba.id
    WHERE
        bt.tenant_id::text = current_setting('app.current_tenant_id', true)
        OR current_setting('app.current_tenant_id', true) = 'unset';
    ''')

def create_views_backward(apps, schema_editor):
    """
    Drop database views created for tenant-aware reporting.
    """
    # Skip if not using PostgreSQL
    if schema_editor.connection.vendor != 'postgresql':
        return
        
    # Drop views
    schema_editor.execute('DROP VIEW IF EXISTS banking_account_view;')
    schema_editor.execute('DROP VIEW IF EXISTS banking_transaction_view;')

class Migration(migrations.Migration):
    dependencies = [
        ('custom_auth', '0002_setup_row_level_security'),
    ]

    operations = [
        migrations.RunPython(create_views_forward, create_views_backward),
    ] 