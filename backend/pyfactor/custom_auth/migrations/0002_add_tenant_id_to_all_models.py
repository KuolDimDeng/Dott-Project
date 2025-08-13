"""
Comprehensive migration to add tenant_id to ALL tables that inherit from TenantAwareModel.
This migration ensures all tables have the tenant_id column for proper tenant isolation.
"""

from django.db import migrations
import logging

logger = logging.getLogger(__name__)

def add_tenant_id_to_all_tables(apps, schema_editor):
    """Add tenant_id column to all tables that need it."""
    
    # Comprehensive list of all tables that should have tenant_id
    # Grouped by app for clarity
    tables_by_app = {
        'finance': [
            'finance_account',
            'finance_financetransaction',
            'finance_accountcategory',
            'finance_chartofaccount',
            'finance_journalentry',
            'finance_journalentryline',
            'finance_generalledgerentry',
            'finance_fixedasset',
            'finance_budget',
        ],
        'sales': [
            'sales_invoice',
            'sales_salestax',
            'sales_salesproduct',
            'sales_invoiceitem',
            'sales_estimate',
            'sales_estimateitem',
            'sales_estimateattachment',
            'sales_salesorder',
            'sales_salesorderitem',
            'sales_postransaction',
            'sales_postransactionitem',
            'sales_sale',
            'sales_saleitem',
            'sales_posrefund',
            'sales_posrefunditem',
            'sales_refund',
            'sales_refunditem',
        ],
        'payments': [
            'payments_paymentgateway',
            'payments_paymentmethod',
            'payments_transaction',
            'payments_webhookevent',
            'payments_paymentauditlog',
            'payments_paymentreconciliation',
            'payments_paymentconfiguration',
        ],
        'banking': [
            'banking_bankintegration',
            'banking_country',
            'banking_paymentgateway',
            'banking_countrypaymentgateway',
            'banking_bankaccount',
            'banking_banktransaction',
            'banking_bankingrule',
            'banking_paymentsettlement',
            'banking_bankingauditlog',
        ],
        'inventory': [
            'inventory_vendor',
            'inventory_product',
            'inventory_service',
            'inventory_stockmovement',
            'inventory_warehouse',
            'inventory_inventoryadjustment',
        ],
        'hr': [
            'hr_role',
            'hr_employeerole',
            'hr_accesspermission',
            'hr_preboardingform',
            'hr_timesheetsetting',
            'hr_companyholiday',
            'hr_timesheet',
            'hr_timesheetentry',
            'hr_timeoffrequest',
            'hr_timeoffbalance',
            'hr_benefits',
            'hr_performancereview',
            'hr_performancemetric',
            'hr_performancerating',
            'hr_performancegoal',
            'hr_feedbackrecord',
            'hr_performancesetting',
        ],
        'payroll': [
            'payroll_payrollrun',
            'payroll_payrolltransaction',
            'payroll_taxform',
            'payroll_paymentdepositmethod',
            'payroll_incomewithholding',
            'payroll_paysetting',
            'payroll_bonuspayment',
            'payroll_paystatement',
            'payroll_employeestripeaccount',
            'payroll_payrollstripepayment',
            'payroll_employeepayoutrecord',
        ],
        'jobs': [
            'jobs_job',
            'jobs_jobmaterial',
            'jobs_jobassignment',
            'jobs_joblabor',
            'jobs_jobexpense',
            'jobs_jobdocument',
            'jobs_jobstatushistory',
            'jobs_jobcommunication',
            'jobs_jobinvoice',
        ],
        'crm': [
            'crm_customer',
        ],
        'product_suppliers': [
            'product_suppliers_productsupplier',
            'product_suppliers_productsupplieritem',
        ],
        'notifications': [
            'notifications_notificationrecipient',
            'notifications_usernotificationsettings',
        ],
        'reports': [
            'reports_report',
        ],
        'analysis': [
            'analysis_financialdata',
            'analysis_chartconfiguration',
        ],
        'events': [
            'events_event',
        ],
        'taxes': [
            'taxes_taxfilinglocation',
            'taxes_taxreminder',
            'taxes_taxrate',
            'taxes_taxconfiguration',
            'taxes_taxfiling',
            'taxes_taxliability',
            'taxes_taxauditlog',
        ],
        'purchases': [
            'purchases_bill',
            'purchases_billitem',
            'purchases_vendor',
            'purchases_vendorpayment',
            'purchases_purchaseorder',
            'purchases_purchaseorderitem',
        ],
    }
    
    db_alias = schema_editor.connection.alias
    
    with schema_editor.connection.cursor() as cursor:
        # Get a default tenant_id from existing data
        cursor.execute("""
            SELECT DISTINCT tenant_id 
            FROM custom_auth_user 
            WHERE tenant_id IS NOT NULL 
            LIMIT 1;
        """)
        result = cursor.fetchone()
        default_tenant_id = result[0] if result else None
        
        total_tables = sum(len(tables) for tables in tables_by_app.values())
        processed = 0
        
        for app_name, tables in tables_by_app.items():
            logger.info(f"\n=== Processing {app_name} app ===")
            
            for table_name in tables:
                processed += 1
                try:
                    # Check if table exists
                    cursor.execute(f"""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = '{table_name}'
                        );
                    """)
                    table_exists = cursor.fetchone()[0]
                    
                    if not table_exists:
                        logger.info(f"[{processed}/{total_tables}] Table {table_name} does not exist, skipping")
                        continue
                    
                    # Check if tenant_id column already exists
                    cursor.execute(f"""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = '{table_name}' 
                        AND column_name = 'tenant_id';
                    """)
                    
                    if cursor.fetchone():
                        logger.info(f"[{processed}/{total_tables}] ✅ {table_name} already has tenant_id")
                        continue
                    
                    # Add tenant_id column
                    cursor.execute(f"""
                        ALTER TABLE {table_name} 
                        ADD COLUMN IF NOT EXISTS tenant_id uuid;
                    """)
                    logger.info(f"[{processed}/{total_tables}] ➕ Added tenant_id to {table_name}")
                    
                    # Update existing rows with default tenant_id if available
                    if default_tenant_id:
                        cursor.execute(f"""
                            UPDATE {table_name} 
                            SET tenant_id = %s 
                            WHERE tenant_id IS NULL;
                        """, [default_tenant_id])
                        
                        rows_updated = cursor.rowcount
                        if rows_updated > 0:
                            logger.info(f"    └─ Updated {rows_updated} rows with tenant_id")
                    
                    # Create index for performance
                    cursor.execute(f"""
                        CREATE INDEX IF NOT EXISTS idx_{table_name}_tenant_id 
                        ON {table_name}(tenant_id);
                    """)
                    
                except Exception as e:
                    logger.error(f"[{processed}/{total_tables}] ❌ Error processing {table_name}: {str(e)}")
                    # Continue with other tables
                    continue
        
        logger.info(f"\n✅ Processed {processed} tables total")

def reverse_migration(apps, schema_editor):
    """We don't want to remove tenant_id columns on reverse."""
    logger.info("Reverse migration called - not removing tenant_id columns for safety")
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(
            add_tenant_id_to_all_tables,
            reverse_migration,
            elidable=False
        ),
    ]