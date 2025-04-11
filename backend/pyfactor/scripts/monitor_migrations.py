#!/usr/bin/env python
"""
Script to monitor database migrations in real-time.
This script helps observe what's happening with migrations during the onboarding process.

Usage:
    python monitor_migrations.py [--interval 1] [--schema schema_name]

Options:
    --interval   Polling interval in seconds (default: 1)
    --schema     Specific schema to monitor (default: monitor all schemas)
"""

import os
import sys
import time
import argparse
import logging
import django
from datetime import datetime

# Check if tabulate is installed
try:
    from tabulate import tabulate
except ImportError:
    # Define a simple tabulate function if the package is not installed
    def tabulate(data, headers, tablefmt=None):
        """Simple tabulate implementation for when the package is not installed"""
        result = []
        # Add headers
        header_row = /* RLS: Use tenant_id filtering */ join(str(h) for h in headers)
        result.append(header_row)
        result.append("-" * len(header_row))
        
        # Add data rows
        for row in data:
            result.append(/* RLS: Use tenant_id filtering */ join(str(cell) for cell in row))
        
        return "\n".join(result)

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Import Django models
from django.db import connection
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('migration_monitor.log')
    ]
)
logger = logging.getLogger('migration_monitor')

class MigrationMonitor:
    """Class to monitor database migrations in real-time"""
    
    def __init__(self, interval=1, schema=None):
        self.interval = interval
        self.schema = schema
        self.previous_state = {}
        self.start_time = datetime.now()
        
        logger.info(f"Migration monitor initialized")
        logger.info(f"Interval: {interval} seconds")
        logger.info(f"Schema filter: {schema if schema else 'All schemas'}")
    
    def get_schemas(self):
        """Get all schemas in the database"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name FROM information_schema.schemata
                WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1', 'public')
                ORDER BY schema_name
            """)
            schemas = [row[0] for row in cursor.fetchall()]
        
        # Filter by schema if specified
        if self.schema:
            schemas = [s for s in schemas if s == self.schema]
        
        return schemas
    
    def get_tables_in_schema(self, schema):
        """Get all tables in a schema"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = %s
                ORDER BY table_name
            """, [schema])
            tables = [row[0] for row in cursor.fetchall()]
        
        return tables
    
    def get_row_counts(self, schema, tables):
        """Get row counts for tables in a schema"""
        row_counts = {}
        
        with connection.cursor() as cursor:
            for table in tables:
                try:
                    cursor.execute(f'SET search_path TO "{schema}",public')
                    cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
                    count = cursor.fetchone()[0]
                    row_counts[table] = count
                except Exception as e:
                    logger.warning(f"Error getting row count for {schema}.{table}: {str(e)}")
                    row_counts[table] = -1
        
        return row_counts
    
    def get_schema_size(self, schema):
        """Get the size of a schema in bytes"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT pg_size_pretty(pg_database_size(current_database()))
            """)
            total_size = cursor.fetchone()[0]
            
            cursor.execute("""
                SELECT pg_size_pretty(sum(pg_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))))
                FROM pg_tables
                WHERE schemaname = %s
            """, [schema])
            schema_size = cursor.fetchone()[0]
        
        return schema_size, total_size
    
    def get_active_connections(self, schema=None):
        """Get active database connections"""
        with connection.cursor() as cursor:
            if schema:
                cursor.execute("""
                    SELECT count(*) FROM pg_stat_activity
                    WHERE datname = current_database()
                    AND query LIKE %s
                """, [f'%{schema}%'])
            else:
                cursor.execute("""
                    SELECT count(*) FROM pg_stat_activity
                    WHERE datname = current_database()
                """)
            
            count = cursor.fetchone()[0]
        
        return count
    
    def get_migration_status(self):
        """Get migration status for all schemas"""
        schemas = self.get_schemas()
        status = {}
        
        for schema in schemas:
            tables = self.get_tables_in_schema(schema)
            row_counts = self.get_row_counts(schema, tables)
            schema_size, total_size = self.get_schema_size(schema)
            
            # Get tenant info if available
            tenant = Tenant.objects.filter(schema_name=schema).first()
            tenant_info = {
                'owner': str(tenant.owner.email) if tenant and tenant.owner else 'Unknown',
                'database_status': tenant.database_status if tenant else 'Unknown',
                'setup_status': tenant.setup_status if tenant else 'Unknown',
            }
            
            # Get onboarding progress if available
            if tenant and tenant.owner:
                progress = OnboardingProgress.objects.filter(user=tenant.owner).first()
                if progress:
                    tenant_info['onboarding_status'] = progress.onboarding_status
                    tenant_info['task_id'] = progress.database_setup_task_id
            
            status[schema] = {
                'tables': len(tables),
                'table_list': tables,
                'row_counts': row_counts,
                'schema_size': schema_size,
                'total_size': total_size,
                'tenant_info': tenant_info,
                'connections': self.get_active_connections(schema)
            }
        
        return status
    
    def print_status_table(self, status):
        """Print status as a table"""
        table_data = []
        
        for schema, data in status.items():
            tenant_info = data['tenant_info']
            
            # Calculate total rows
            total_rows = sum(count for count in data['row_counts'].values() if count >= 0)
            
            # Format table list
            table_list = ', '.join(data['table_list'][:5])
            if len(data['table_list']) > 5:
                table_list += f' ... ({len(data["table_list"]) - 5} more)'
            
            table_data.append([
                schema,
                data['tables'],
                total_rows,
                data['schema_size'],
                tenant_info.get('owner', 'Unknown'),
                tenant_info.get('database_status', 'Unknown'),
                tenant_info.get('setup_status', 'Unknown'),
                tenant_info.get('onboarding_status', 'Unknown'),
                data['connections']
            ])
        
        headers = [
            'Schema', 'Tables', 'Total Rows', 'Size', 'Owner', 
            'DB Status', 'Setup Status', 'Onboarding Status', 'Connections'
        ]
        
        print("\n" + "=" * 100)
        print(f"Migration Monitor - {datetime.now()} (Running for: {datetime.now() - self.start_time})")
        print("=" * 100)
        print(tabulate(table_data, headers=headers, tablefmt='grid'))
        print("=" * 100 + "\n")
    
    def detect_changes(self, current_state):
        """Detect changes between current and previous state"""
        changes = []
        
        for schema, data in current_state.items():
            if schema not in self.previous_state:
                changes.append(f"New schema created: {schema}")
                continue
            
            prev_data = self.previous_state[schema]
            
            # Check for new tables
            new_tables = set(data['table_list']) - set(prev_data['table_list'])
            if new_tables:
                changes.append(f"New tables in {schema}: {', '.join(new_tables)}")
            
            # Check for table row count changes
            for table, count in data['row_counts'].items():
                if table in prev_data['row_counts'] and count != prev_data['row_counts'][table]:
                    changes.append(f"Row count changed for {schema}.{table}: {prev_data['row_counts'][table]} -> {count}")
            
            # Check for status changes
            current_status = data['tenant_info'].get('setup_status')
            prev_status = prev_data['tenant_info'].get('setup_status')
            if current_status != prev_status:
                changes.append(f"Setup status changed for {schema}: {prev_status} -> {current_status}")
            
            current_db_status = data['tenant_info'].get('database_status')
            prev_db_status = prev_data['tenant_info'].get('database_status')
            if current_db_status != prev_db_status:
                changes.append(f"Database status changed for {schema}: {prev_db_status} -> {current_db_status}")
            
            current_onboarding = data['tenant_info'].get('onboarding_status')
            prev_onboarding = prev_data['tenant_info'].get('onboarding_status')
            if current_onboarding != prev_onboarding:
                changes.append(f"Onboarding status changed for {schema}: {prev_onboarding} -> {current_onboarding}")
        
        # Check for deleted schemas
        deleted_schemas = set(self.previous_state.keys()) - set(current_state.keys())
        for schema in deleted_schemas:
            changes.append(f"Schema deleted: {schema}")
        
        return changes
    
    def run(self):
        """Run the migration monitor"""
        try:
            logger.info("Starting migration monitor")
            
            while True:
                # Get current status
                current_state = self.get_migration_status()
                
                # Print status table
                self.print_status_table(current_state)
                
                # Detect and print changes
                if self.previous_state:
                    changes = self.detect_changes(current_state)
                    if changes:
                        print("Changes detected:")
                        for change in changes:
                            print(f"  - {change}")
                            logger.info(change)
                        print()
                
                # Update previous state
                self.previous_state = current_state
                
                # Wait for next check
                time.sleep(self.interval)
                
        except KeyboardInterrupt:
            logger.info("Migration monitor stopped by user")
        except Exception as e:
            logger.error(f"Migration monitor error: {str(e)}")
            raise

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Monitor database migrations')
    parser.add_argument('--interval', type=float, default=1, help='Polling interval in seconds')
    parser.add_argument('--schema', help='Specific schema to monitor')
    return parser.parse_args()

if __name__ == '__main__':
    args = parse_args()
    
    # Create and run the monitor
    monitor = MigrationMonitor(args.interval, args.schema)
    monitor.run()