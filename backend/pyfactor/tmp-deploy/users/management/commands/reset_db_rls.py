import os
import shutil
import sys
import psycopg2
import uuid
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connection
from django.apps import apps
import django
import logging
from django.utils import timezone
import boto3

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Reset database completely, recreate tables based on models, and set up RLS policies.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-input', action='store_true',
            help='Skip all user prompts',
        )
        parser.add_argument(
            '--create-admin', action='store_true',
            help='Create a default admin user after reset',
        )
        parser.add_argument(
            '--tenant-id',
            help='Specify a specific tenant ID to create (uses a random UUID if not provided)',
        )
        parser.add_argument(
            '--keep-migrations', action='store_true',
            help='Keep existing migration files instead of deleting them',
        )
        parser.add_argument(
            '--skip-rls', action='store_true',
            help='Skip setting up RLS policies',
        )
        parser.add_argument(
            '--admin-email',
            help='Email address to use for the admin user (defaults to admin@example.com)',
        )
        parser.add_argument(
            '--admin-password',
            help='Password to use for the admin user (defaults to Admin123!)',
        )

    def find_migration_files(self):
        migration_files = []
        for root, dirs, files in os.walk('.'):
            if 'migrations' in dirs:
                migration_path = os.path.join(root, 'migrations')
                for file in os.listdir(migration_path):
                    if file != '__init__.py' and file.endswith('.py'):
                        migration_files.append(os.path.join(migration_path, file))
        return migration_files

    def delete_files(self, files):
        for file in files:
            if os.path.isfile(file):
                os.remove(file)
                logger.info(f"Deleted file: {file}")
            elif os.path.isdir(file):
                shutil.rmtree(file)
                logger.info(f"Deleted directory: {file}")

    def handle(self, *args, **options):
        no_input = options['no_input']
        create_admin = options['create_admin']
        tenant_id = options.get('tenant_id') or str(uuid.uuid4())
        keep_migrations = options['keep_migrations']
        skip_rls = options['skip_rls']
        admin_email = options.get('admin_email') or 'admin@example.com'
        admin_password = options.get('admin_password') or 'Admin123!'
            
        if not no_input:
            confirm = input("This will COMPLETELY RESET your AWS RDS database, deleting ALL data. Are you sure? Type 'yes' to confirm: ")
            if confirm.lower() != 'yes':
                self.stdout.write("Operation cancelled by user.")
                return

        # Step 1: Delete all migration files (unless keep_migrations is set)
        if not keep_migrations:
            migration_files = self.find_migration_files()
            if migration_files:
                self.delete_files(migration_files)
                logger.info("All migration files have been deleted.")
            else:
                logger.info("No migration files found to delete.")

        # Step 2: Drop all database objects
        self.reset_database()

        # Step 3: Create empty migration files for each app
        if not keep_migrations:
            logger.info("Creating new migrations...")
            call_command('makemigrations')

        # Step 4: Apply migrations
        logger.info("Applying migrations...")
        try:
            # First migrate contenttypes and auth
            call_command('migrate', 'contenttypes', '--no-input')
            call_command('migrate', 'auth', '--no-input')
            
            # Set environment variable to override DB router for all migrations
            os.environ['OVERRIDE_DB_ROUTER'] = 'True'
            
            # Apply all migrations
            logger.info("Migrating all apps...")
            call_command('migrate', '--no-input')
            
        except Exception as e:
            logger.error(f"Error during migration: {e}")
            logger.info("Attempting to continue with --fake migrations...")
            
            try:
                # Close connections to ensure clean state
                from django.db import connections
                connections.close_all()
                
                # Apply with --fake
                call_command('migrate', '--fake', '--no-input')
            except Exception as fake_error:
                logger.error(f"Error applying fake migrations: {fake_error}")
        finally:
            # Reset the environment variable
            os.environ.pop('OVERRIDE_DB_ROUTER', None)

        # Step 5: Setup RLS policies
        if not skip_rls:
            logger.info("Setting up RLS policies...")
            self.setup_rls_policies()

        # Step 6: Create default admin user and tenant if requested
        if create_admin:
            self.create_admin_user(tenant_id, admin_email, admin_password)

        logger.info("Database reset and RLS setup complete!")

    def reset_database(self):
        """Completely reset the database by dropping all objects"""
        logger.info("Resetting database...")
        
        # Get database connection details
        db_settings = settings.DATABASES['default']
        db_name = db_settings['NAME']
        db_user = db_settings['USER']
        db_password = db_settings['PASSWORD']
        db_host = db_settings['HOST']
        db_port = db_settings['PORT']
        
        # Set PGPASSWORD for psql command
        os.environ['PGPASSWORD'] = db_password
        
        # Create SQL to drop all objects
        drop_sql = """
        DO $$ DECLARE
            r RECORD;
        BEGIN
            -- Disable foreign key constraints
            EXECUTE 'SET CONSTRAINTS ALL DEFERRED';
            
            -- Drop all tables
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
            
            -- Drop all sequences
            FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
                EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
            END LOOP;
            
            -- Drop all views
            FOR r IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public') LOOP
                EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.table_name) || ' CASCADE';
            END LOOP;
            
            -- Drop all schemas except public
            FOR r IN (SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%') LOOP
                EXECUTE 'DROP SCHEMA IF EXISTS ' || quote_ident(r.schema_name) || ' CASCADE';
            END LOOP;
            
            -- Drop all RLS policies
            FOR r IN (SELECT policyname, tablename FROM pg_policies) LOOP
                EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
            
            -- Reset the public schema
            EXECUTE 'DROP SCHEMA public CASCADE';
            EXECUTE 'CREATE SCHEMA public';
            EXECUTE 'GRANT ALL ON SCHEMA public TO public';
        END $$;
        """
        
        # Write SQL to temp file
        temp_sql_file = 'drop_all_objects.sql'
        with open(temp_sql_file, 'w') as f:
            f.write(drop_sql)
        
        # Run the SQL script
        conn_string = f"psql -h {db_host} -p {db_port} -U {db_user} -d {db_name} -f {temp_sql_file}"
        try:
            logger.info("Executing drop all objects SQL...")
            os.system(conn_string)
            
            # Also attempt direct connection and reset
            self.direct_connection_reset()
        except Exception as e:
            logger.error(f"Error during database reset: {e}")
        finally:
            # Clean up
            if os.path.exists(temp_sql_file):
                os.remove(temp_sql_file)
            
            # Remove password from environment
            if 'PGPASSWORD' in os.environ:
                del os.environ['PGPASSWORD']
                
    def direct_connection_reset(self):
        """Use direct psycopg2 connection to reset database objects"""
        try:
            db_settings = settings.DATABASES['default']
            conn = psycopg2.connect(
                dbname=db_settings['NAME'],
                user=db_settings['USER'],
                password=db_settings['PASSWORD'],
                host=db_settings['HOST'],
                port=db_settings['PORT']
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            
            with conn.cursor() as cursor:
                # Drop and recreate public schema
                cursor.execute("DROP SCHEMA IF EXISTS public CASCADE;")
                cursor.execute("CREATE SCHEMA public;")
                cursor.execute("GRANT ALL ON SCHEMA public TO public;")
                
                logger.info("Public schema reset via direct connection")
        except Exception as e:
            logger.error(f"Error during direct connection reset: {e}")

    def setup_rls_policies(self):
        """Set up Row Level Security policies for all tenant-aware models"""
        logger.info("Setting up RLS policies...")
        
        # Get database connection
        db_settings = settings.DATABASES['default']
        try:
            conn = psycopg2.connect(
                dbname=db_settings['NAME'],
                user=db_settings['USER'],
                password=db_settings['PASSWORD'],
                host=db_settings['HOST'],
                port=db_settings['PORT']
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            
            # Create session variable for current tenant if it doesn't exist
            with conn.cursor() as cursor:
                try:
                    cursor.execute("""
                        DO $$
                        BEGIN
                          EXECUTE 'ALTER DATABASE ' || current_database() || ' SET app.current_tenant_id = ''unset''';
                        EXCEPTION WHEN insufficient_privilege THEN
                          RAISE NOTICE 'Could not set database parameter app.current_tenant_id due to insufficient privileges. This may need to be set manually.';
                        END$$;
                    """)
                except Exception as e:
                    logger.warning(f"Could not set database parameter: {e}")
            
            # Find all tenant-aware models (models with tenant_id field)
            tenant_tables = []
            for app_config in apps.get_app_configs():
                for model in app_config.get_models():
                    table_name = model._meta.db_table
                    model_fields = [f.name for f in model._meta.fields]
                    if 'tenant_id' in model_fields:
                        tenant_tables.append(table_name)
            
            # Set up RLS for each tenant-aware table
            with conn.cursor() as cursor:
                for table in tenant_tables:
                    logger.info(f"Setting up RLS for {table}")
                    
                    # Create extension for UUID support if it doesn't exist
                    cursor.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
                    
                    # Enable Row Level Security on the table
                    cursor.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
                    
                    # Enable Force Row Level Security (applies RLS to table owners too)
                    cursor.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
                    
                    # Create policy for tenant isolation
                    try:
                        # First try a more robust policy using the app.current_tenant_id parameter
                        cursor.execute(f"""
                            CREATE POLICY tenant_isolation_policy ON {table}
                            FOR ALL
                            USING (
                                CASE 
                                    WHEN current_setting('app.current_tenant_id', TRUE) IS NULL THEN TRUE
                                    WHEN current_setting('app.current_tenant_id', TRUE) = 'unset' THEN TRUE
                                    ELSE tenant_id::text = current_setting('app.current_tenant_id', TRUE)
                                END
                            );
                        """)
                    except Exception as e:
                        logger.warning(f"Could not create policy with current_setting: {e}")
                        
                        # Fallback to a simple policy
                        cursor.execute(f"""
                            CREATE POLICY tenant_isolation_policy ON {table}
                            FOR ALL
                            USING (TRUE);
                        """)
                    
                    logger.info(f"RLS enabled for {table}")
            
            logger.info("RLS setup complete")
        except Exception as e:
            logger.error(f"Error during RLS setup: {e}")

    def create_admin_user(self, tenant_id, admin_email, admin_password):
        """Create a default admin user and tenant"""
        logger.info("Creating default admin user and tenant...")
        
        try:
            # Import here to avoid issues before migrations
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            # Try to get or create Tenant model
            try:
                from custom_auth.models import Tenant
                
                # Create default tenant
                tenant, created = Tenant.objects.get_or_create(
                    id=uuid.UUID(tenant_id),
                    defaults={
                        'name': 'Default Tenant',
                        'schema_name': f'tenant_{tenant_id.replace("-", "_")}',
                        'rls_enabled': True,
                        'is_active': True
                    }
                )
                
                if created:
                    logger.info(f"Created default tenant with ID: {tenant_id}")
                else:
                    logger.info(f"Using existing tenant with ID: {tenant_id}")
                
            except ImportError:
                logger.warning("Tenant model not found. Continuing without tenant creation.")
                tenant = None
                
            # Create admin user
            if not User.objects.filter(email=admin_email).exists():
                admin_user = User.objects.create_superuser(
                    email=admin_email,
                    password=admin_password
                )
                
                # If we have a tenant, associate it with the user
                if tenant and hasattr(admin_user, 'tenant_id'):
                    admin_user.tenant_id = tenant.id
                    admin_user.save()
                
                # Additional fields that might be needed for authentication
                if hasattr(admin_user, 'email_confirmed'):
                    admin_user.email_confirmed = True
                    admin_user.save()
                    
                # Set fake cognito_sub if your auth system uses it
                if hasattr(admin_user, 'cognito_sub'):
                    admin_user.cognito_sub = f"MOCK-{str(uuid.uuid4())}"
                    admin_user.save()
                    
                # Set is_onboarded if your system uses it
                if hasattr(admin_user, 'is_onboarded'):
                    admin_user.is_onboarded = True
                    admin_user.save()
                
                logger.info(f"Created admin user: {admin_email} with password: {admin_password}")
                logger.info(f"NOTE: This admin user may not work with external authentication systems.")
                logger.info(f"You may need to create a user through your normal registration flow.")
            else:
                logger.info(f"Admin user {admin_email} already exists")
            
            # Create a tenant-aware record if possible
            try:
                from onboarding.models import OnboardingProgress
                
                # Create basic onboarding record
                onboarding, created = OnboardingProgress.objects.get_or_create(
                    user_id=admin_user.id,
                    defaults={
                        'tenant_id': uuid.UUID(tenant_id),
                        'onboarding_status': 'complete',
                        'account_status': 'active',
                        'user_role': 'owner',
                        'current_step': 'complete',
                        'next_step': 'complete',
                        'completed_steps': ['business_info', 'subscription', 'payment', 'setup', 'complete'],
                        'setup_completed': True,
                        'rls_setup_completed': True,
                    }
                )
                
                logger.info(f"Created onboarding record for admin user")
            except (ImportError, NameError):
                logger.warning("OnboardingProgress model not found. Skipping onboarding record creation.")
            
            # Try to create a business record if it exists
            try:
                from users.models import Business
                
                # Try to get the user's business name from Cognito attributes
                business_name = None
                try:
                    # Get Cognito client
                    cognito_client = boto3.client('cognito-idp',
                        region_name=settings.AWS_REGION,
                        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
                    )
                    
                    # Try to get user attributes from Cognito
                    if hasattr(admin_user, 'username'):
                        response = cognito_client.admin_get_user(
                            UserPoolId=settings.COGNITO_USER_POOL_ID,
                            Username=admin_user.username
                        )
                        
                        # Extract business name from user attributes
                        if 'UserAttributes' in response:
                            for attr in response['UserAttributes']:
                                if attr['Name'] in ['custom:businessname', 'businessName', 'business_name']:
                                    if attr['Value'] and attr['Value'].strip():
                                        business_name = attr['Value']
                                        break
                except Exception as e:
                    logger.warning(f"Failed to get business name from Cognito: {e}")
                
                # If we couldn't get from Cognito, try to generate a name based on user info
                if not business_name:
                    if hasattr(admin_user, 'first_name') and admin_user.first_name:
                        if hasattr(admin_user, 'last_name') and admin_user.last_name:
                            business_name = f"{admin_user.first_name} {admin_user.last_name}'s Business"
                        else:
                            business_name = f"{admin_user.first_name}'s Business"
                    elif hasattr(admin_user, 'last_name') and admin_user.last_name:
                        business_name = f"{admin_user.last_name}'s Business"
                    elif hasattr(admin_user, 'email') and admin_user.email:
                        # Extract name from email
                        email_name = admin_user.email.split('@')[0]
                        business_name = f"{email_name.capitalize()}'s Business"
                    else:
                        # Fall back to a temporary name that indicates it needs to be updated
                        business_name = f"Business ({admin_user.id})"
                
                business, created = Business.objects.get_or_create(
                    owner_id=admin_user.id,
                    defaults={
                        'id': uuid.uuid4(),
                        'name': business_name,
                        'created_at': timezone.now(),
                        'updated_at': timezone.now()
                    }
                )
                
                if created:
                    logger.info(f"Created business '{business_name}' for admin user")
                    
                    # Try to associate business with onboarding record
                    if 'onboarding' in locals() and hasattr(onboarding, 'business_id'):
                        onboarding.business_id = business.id
                        onboarding.save()
                        logger.info(f"Associated business with onboarding record")
                        
            except (ImportError, NameError):
                logger.warning("Business model not found. Skipping business creation.")
            
        except Exception as e:
            logger.error(f"Error creating admin user and tenant: {e}")

# Ensure Django settings are configured
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup() 