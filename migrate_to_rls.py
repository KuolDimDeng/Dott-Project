#!/usr/bin/env python
import os
import sys
import uuid
import psycopg2
import psycopg2.extras
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f"migrate_to_rls_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("migrate_to_rls")

# Get database credentials from environment
DB_HOST = os.environ.get("DB_HOST", "dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com")
DB_NAME = os.environ.get("DB_NAME", "dott_main")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_PORT = os.environ.get("DB_PORT", "5432")

# Tables that should be included in migration
TENANT_AWARE_TABLES = [
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
    # Add any other tables that need tenant isolation
]

def connect_to_db():
    """Create a connection to the database"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT
        )
        conn.autocommit = False  # We want to control transactions explicitly
        logger.info(f"Connected to database {DB_NAME} on {DB_HOST}")
        return conn
    except Exception as e:
        logger.error(f"Error connecting to database: {str(e)}")
        sys.exit(1)

def get_all_tenant_schemas(conn):
    """Get all tenant schemas in the database"""
    schemas = []
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT nspname 
            FROM pg_namespace 
            WHERE nspname LIKE 'tenant_%' 
              AND nspname NOT LIKE 'tenant_template'
        """)
        schemas = [row[0] for row in cursor.fetchall()]
    
    logger.info(f"Found {len(schemas)} tenant schemas")
    return schemas

def get_tenant_id_from_schema(schema_name):
    """Extract tenant ID from schema name"""
    # Assuming schema format is tenant_XXXX where XXXX is UUID with _ instead of -
    if not schema_name.startswith('tenant_'):
        return None
    
    # Extract ID part and convert underscores back to dashes
    id_part = schema_name[7:]  # Remove 'tenant_' prefix
    uuid_str = id_part.replace('_', '-')
    
    try:
        return uuid.UUID(uuid_str)
    except ValueError:
        logger.error(f"Could not parse UUID from schema name: {schema_name}")
        return None

def get_table_columns(conn, schema, table):
    """Get all columns for a table in the specified schema"""
    columns = []
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = %s 
              AND table_name = %s
        """, [schema, table])
        columns = [row[0] for row in cursor.fetchall()]
    
    return columns

def table_exists(conn, schema, table):
    """Check if a table exists in the specified schema"""
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_schema = %s 
                  AND table_name = %s
            )
        """, [schema, table])
        return cursor.fetchone()[0]

def migrate_table_data(conn, schema, table, tenant_id):
    """Migrate data from a tenant schema to public schema with tenant_id"""
    # Check if the table exists in the source schema
    if not table_exists(conn, schema, table):
        logger.info(f"Table {schema}.{table} does not exist, skipping")
        return 0
    
    # Get columns for the table
    columns = get_table_columns(conn, schema, table)
    if not columns:
        logger.warning(f"No columns found for {schema}.{table}, skipping")
        return 0
    
    # Check if tenant_id column exists in the public table
    public_columns = get_table_columns(conn, 'public', table)
    if 'tenant_id' not in public_columns:
        logger.error(f"Table public.{table} does not have tenant_id column, skipping")
        return 0
    
    # Remove tenant_id from the list if it exists in source table
    # (we'll set our own tenant_id from the schema name)
    if 'tenant_id' in columns:
        columns.remove('tenant_id')
    
    # Build the column list for the SQL query
    column_list = ', '.join(columns)
    placeholders = ', '.join(['%s'] * (len(columns) + 1))  # +1 for tenant_id
    
    try:
        with conn.cursor() as cursor:
            # Get data from source table
            cursor.execute(f'SELECT {column_list} FROM "{schema}"."{table}"')
            rows = cursor.fetchall()
            
            if not rows:
                logger.info(f"No data in {schema}.{table}, skipping")
                return 0
            
            # Prepare for batch insert
            rows_with_tenant_id = []
            for row in rows:
                # Add tenant_id as the last element in each row
                rows_with_tenant_id.append(row + (tenant_id,))
            
            # Insert into public schema with tenant_id
            # First create a temp table to avoid unique constraint violations
            temp_table = f"temp_{table}_{uuid.uuid4().hex[:8]}"
            
            # Create temp table like the target table
            cursor.execute(f"""
                CREATE TEMP TABLE {temp_table} 
                (LIKE public.{table} INCLUDING ALL)
                ON COMMIT DROP
            """)
            
            # Copy columns for insert
            insert_columns = column_list + ', tenant_id'
            
            # Batch insert using executemany
            cursor.executemany(
                f"INSERT INTO {temp_table} ({insert_columns}) VALUES ({placeholders})",
                rows_with_tenant_id
            )
            
            # Now insert from temp table to target table, ignoring duplicates
            # This needs to be customized based on your primary key structure
            cursor.execute(f"""
                INSERT INTO public.{table} ({insert_columns})
                SELECT {insert_columns} FROM {temp_table}
                ON CONFLICT DO NOTHING
            """)
            
            migrated_count = cursor.rowcount
            logger.info(f"Migrated {migrated_count} rows from {schema}.{table} to public.{table}")
            return migrated_count
    
    except Exception as e:
        logger.error(f"Error migrating data for {schema}.{table}: {str(e)}")
        conn.rollback()
        return 0

def apply_rls_policy(conn, table):
    """Apply RLS policy to a table"""
    try:
        with conn.cursor() as cursor:
            # Enable RLS on the table
            cursor.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
            
            # Drop existing policy if it exists
            cursor.execute(f"DROP POLICY IF EXISTS tenant_isolation_policy ON public.{table}")
            
            # Create new policy
            cursor.execute(f"""
                CREATE POLICY tenant_isolation_policy ON public.{table}
                AS RESTRICTIVE
                USING (
                    (tenant_id::TEXT = NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset'))
                    OR current_setting('app.current_tenant_id', TRUE) = 'unset'
                )
            """)
            
            logger.info(f"Applied RLS policy to table: public.{table}")
            return True
    
    except Exception as e:
        logger.error(f"Error applying RLS policy to {table}: {str(e)}")
        return False

def ensure_tenant_id_column(conn, table):
    """Ensure the table has a tenant_id column with the right properties"""
    try:
        with conn.cursor() as cursor:
            # Check if tenant_id column exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                      AND table_name = %s
                      AND column_name = 'tenant_id'
                )
            """, [table])
            
            if not cursor.fetchone()[0]:
                # Add tenant_id column
                cursor.execute(f"""
                    ALTER TABLE public.{table} 
                    ADD COLUMN tenant_id UUID NOT NULL DEFAULT uuid_nil()
                """)
                
                # Create index on tenant_id
                cursor.execute(f"""
                    CREATE INDEX IF NOT EXISTS idx_{table}_tenant_id 
                    ON public.{table} (tenant_id)
                """)
                
                logger.info(f"Added tenant_id column to public.{table}")
                
                # After adding, remove the default
                cursor.execute(f"""
                    ALTER TABLE public.{table} 
                    ALTER COLUMN tenant_id DROP DEFAULT
                """)
            else:
                logger.info(f"Table public.{table} already has tenant_id column")
            
            return True
    
    except Exception as e:
        logger.error(f"Error ensuring tenant_id column for {table}: {str(e)}")
        conn.rollback()
        return False

def update_tenant_record(conn, tenant_id, rls_enabled=True):
    """Update tenant record to mark it as using RLS"""
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE custom_auth_tenant
                SET rls_enabled = %s,
                    rls_setup_date = NOW()
                WHERE id = %s
            """, [rls_enabled, tenant_id])
            
            if cursor.rowcount > 0:
                logger.info(f"Updated tenant record {tenant_id} with rls_enabled={rls_enabled}")
                return True
            else:
                logger.warning(f"No tenant record found for {tenant_id}")
                return False
    
    except Exception as e:
        logger.error(f"Error updating tenant record {tenant_id}: {str(e)}")
        conn.rollback()
        return False

def verify_setup_global_rls(conn):
    """Verify and set up global RLS setting"""
    try:
        with conn.cursor() as cursor:
            # Check if the app.current_tenant_id parameter exists
            cursor.execute("""
                SELECT 1 FROM pg_settings WHERE name = 'app.current_tenant_id'
            """)
            
            if not cursor.fetchone():
                # Set up the parameter globally
                dbname = conn.info.dbname
                cursor.execute(f"ALTER DATABASE {dbname} SET app.current_tenant_id = 'unset'")
                
                logger.info(f"Set up app.current_tenant_id parameter for database {dbname}")
            else:
                logger.info(f"app.current_tenant_id parameter already exists")
            
            return True
    
    except Exception as e:
        logger.error(f"Error setting up global RLS: {str(e)}")
        conn.rollback()
        return False

def migrate_schemas_to_rls(dry_run=True):
    """Main function to migrate from schemas to RLS"""
    conn = connect_to_db()
    
    try:
        # 1. Verify global RLS setup
        verify_setup_global_rls(conn)
        
        # 2. Get all tenant schemas
        schemas = get_all_tenant_schemas(conn)
        logger.info(f"Found {len(schemas)} tenant schemas to migrate")
        
        # 3. For each schema, migrate data to public schema with tenant_id
        total_migrated = 0
        for schema in schemas:
            tenant_id = get_tenant_id_from_schema(schema)
            if not tenant_id:
                logger.error(f"Could not extract tenant ID from schema {schema}, skipping")
                continue
            
            logger.info(f"Processing schema {schema} for tenant {tenant_id}")
            
            # Update tenant record to use RLS
            if not dry_run:
                update_tenant_record(conn, tenant_id, True)
            
            # For each table, migrate data
            for table in TENANT_AWARE_TABLES:
                # Ensure table in public schema has tenant_id column
                if not dry_run:
                    ensure_tenant_id_column(conn, table)
                
                # Migrate data
                schema_migrated = 0
                if not dry_run:
                    schema_migrated = migrate_table_data(conn, schema, table, tenant_id)
                else:
                    logger.info(f"[DRY RUN] Would migrate data from {schema}.{table} to public.{table}")
                
                total_migrated += schema_migrated
                
                # Apply RLS policy to the table
                if not dry_run:
                    apply_rls_policy(conn, table)
                else:
                    logger.info(f"[DRY RUN] Would apply RLS policy to public.{table}")
            
            if not dry_run:
                conn.commit()
                logger.info(f"Committed changes for schema {schema}")
            else:
                logger.info(f"[DRY RUN] Would commit changes for schema {schema}")
        
        logger.info(f"{'Would migrate' if dry_run else 'Migrated'} a total of {total_migrated} rows")
        
        # 4. Print summary
        logger.info("Migration summary:")
        logger.info(f"- {'Would process' if dry_run else 'Processed'} {len(schemas)} tenant schemas")
        logger.info(f"- {'Would migrate' if dry_run else 'Migrated'} {total_migrated} rows")
        logger.info(f"- {'Would apply' if dry_run else 'Applied'} RLS policies to {len(TENANT_AWARE_TABLES)} tables")
        
        if dry_run:
            logger.info("THIS WAS A DRY RUN. No changes were made to the database.")
            logger.info("Run with --execute to perform the actual migration.")
    
    except Exception as e:
        logger.error(f"Error during migration: {str(e)}")
        conn.rollback()
    
    finally:
        conn.close()

if __name__ == "__main__":
    # Parse command-line arguments
    import argparse
    parser = argparse.ArgumentParser(description="Migrate from schema-per-tenant to RLS")
    parser.add_argument("--execute", action="store_true", help="Execute the migration (dry run by default)")
    parser.add_argument("--schema", help="Migrate only specific schema")
    args = parser.parse_args()
    
    # Run migration
    migrate_schemas_to_rls(dry_run=not args.execute) 