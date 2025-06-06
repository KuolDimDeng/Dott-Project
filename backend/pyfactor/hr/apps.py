#/Users/kuoldeng/projectx/backend/pyfactor/hr/apps.py

from django.apps import AppConfig
from django.db.models.signals import post_migrate

class HrConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'hr'
    verbose_name = 'HR Management'  # Add this for better admin display
    
    def ready(self):
        """
        Configure app when Django loads it - including RLS setup for 
        timesheet models in this app
        """
        # Register signal handlers
        from . import signals
        
        # Configure RLS (Row-Level Security) for this app
        post_migrate.connect(self.setup_rls_policies, sender=self)
    
    def setup_rls_policies(self, sender, **kwargs):
        """Configure RLS policies for models in this app"""
        from django.db import connection
        
        # Only execute this on PostgreSQL databases that support RLS
        if connection.vendor != 'postgresql':
            return
            
        with connection.cursor() as cursor:
            # Check if tables exist before enabling RLS
            tables_to_check = [
                'hr_timesheetsetting',
                'hr_companyholiday', 
                'hr_timesheet',
                'hr_timesheetentry',
                'hr_timeoffrequest',
                'hr_timeoffbalance'
            ]
            
            existing_tables = []
            for table in tables_to_check:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                    );
                """, [table])
                result = cursor.fetchone()
                if result and result[0]:
                    existing_tables.append(table)
            
            # Only proceed if tables exist
            if not existing_tables:
                return
                
            # Enable RLS on existing timesheet tables
            for table in existing_tables:
                try:
                    cursor.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
                except Exception as e:
                    # Log but continue if RLS is already enabled
                    print(f"Warning: Could not enable RLS on {table}: {e}")
            
            # Create policies that isolate data by business_id - We'll drop and recreate
            # Drop existing policies if they exist
            try:
                if 'hr_timesheetsetting' in existing_tables:
                    cursor.execute("DROP POLICY IF EXISTS timesheetsetting_isolation_policy ON hr_timesheetsetting;")
                if 'hr_companyholiday' in existing_tables:
                    cursor.execute("DROP POLICY IF EXISTS companyholiday_isolation_policy ON hr_companyholiday;")
                if 'hr_timesheet' in existing_tables:
                    cursor.execute("DROP POLICY IF EXISTS timesheet_isolation_policy ON hr_timesheet;")
                if 'hr_timesheetentry' in existing_tables:
                    cursor.execute("DROP POLICY IF EXISTS timesheetentry_isolation_policy ON hr_timesheetentry;")
                if 'hr_timeoffrequest' in existing_tables:
                    cursor.execute("DROP POLICY IF EXISTS timeoffrequest_isolation_policy ON hr_timeoffrequest;")
                if 'hr_timeoffbalance' in existing_tables:
                    cursor.execute("DROP POLICY IF EXISTS timeoffbalance_isolation_policy ON hr_timeoffbalance;")
            except Exception as e:
                # Ignore errors if policies don't exist
                pass
                
            # Create policies only for existing tables
            # For TimesheetSetting
            if 'hr_timesheetsetting' in existing_tables:
                cursor.execute("""
                    CREATE POLICY timesheetsetting_isolation_policy 
                    ON hr_timesheetsetting 
                    USING (business_id::text = current_setting('app.current_tenant', TRUE));
                """)
            
            # For CompanyHoliday
            if 'hr_companyholiday' in existing_tables:
                cursor.execute("""
                    CREATE POLICY companyholiday_isolation_policy 
                    ON hr_companyholiday 
                    USING (business_id::text = current_setting('app.current_tenant', TRUE));
                """)
            
            # For Timesheet
            if 'hr_timesheet' in existing_tables:
                cursor.execute("""
                    CREATE POLICY timesheet_isolation_policy 
                    ON hr_timesheet 
                    USING (business_id::text = current_setting('app.current_tenant', TRUE));
                """)
            
            # For TimesheetEntry - isolated via parent Timesheet
            if 'hr_timesheetentry' in existing_tables and 'hr_timesheet' in existing_tables:
                cursor.execute("""
                    CREATE POLICY timesheetentry_isolation_policy 
                    ON hr_timesheetentry 
                    USING (EXISTS (
                        SELECT 1 FROM hr_timesheet 
                        WHERE hr_timesheet.id = hr_timesheetentry.timesheet_id 
                        AND hr_timesheet.business_id::text = current_setting('app.current_tenant', TRUE)
                    ));
                """)
            
            # For TimeOffRequest
            if 'hr_timeoffrequest' in existing_tables:
                cursor.execute("""
                    CREATE POLICY timeoffrequest_isolation_policy 
                    ON hr_timeoffrequest 
                    USING (business_id::text = current_setting('app.current_tenant', TRUE));
                """)
            
            # For TimeOffBalance
            if 'hr_timeoffbalance' in existing_tables:
                cursor.execute("""
                    CREATE POLICY timeoffbalance_isolation_policy 
                    ON hr_timeoffbalance 
                    USING (business_id::text = current_setting('app.current_tenant', TRUE));
                """)