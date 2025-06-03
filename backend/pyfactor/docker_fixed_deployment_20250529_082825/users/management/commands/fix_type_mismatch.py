import logging
from django.core.management.base import BaseCommand
from django.db import connection

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Fix content type and permission tables to ensure consistent data types'

    def handle(self, *args, **options):
        self.stdout.write("Fixing content type and permission tables...")

        with connection.cursor() as cursor:
            # Start a transaction
            cursor.execute("BEGIN;")
            
            try:
                # Drop dependent tables first in the right order
                self.stdout.write("Dropping dependent tables...")
                cursor.execute("DROP TABLE IF EXISTS django_admin_log CASCADE;")
                cursor.execute("DROP TABLE IF EXISTS auth_user_user_permissions CASCADE;")
                cursor.execute("DROP TABLE IF EXISTS auth_group_permissions CASCADE;")
                cursor.execute("DROP TABLE IF EXISTS auth_permission CASCADE;")
                cursor.execute("DROP TABLE IF EXISTS django_content_type CASCADE;")
                cursor.execute("DROP TABLE IF EXISTS socialaccount_socialapp_sites CASCADE;")
                cursor.execute("DROP TABLE IF EXISTS socialaccount_socialapp CASCADE;")
                cursor.execute("DROP TABLE IF EXISTS django_site CASCADE;")
                
                # Recreate django_content_type with BIGSERIAL
                self.stdout.write("Recreating django_content_type table...")
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS django_content_type (
                    id BIGSERIAL PRIMARY KEY,
                    app_label VARCHAR(100) NOT NULL,
                    model VARCHAR(100) NOT NULL,
                    name VARCHAR(100) NULL,
                    CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq UNIQUE (app_label, model)
                );
                """)
                
                # Recreate auth_permission with BIGINT reference
                self.stdout.write("Recreating auth_permission table...")
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS auth_permission (
                    id BIGSERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    content_type_id BIGINT NOT NULL,
                    codename VARCHAR(100) NOT NULL,
                    CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq UNIQUE (content_type_id, codename),
                    CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id)
                        REFERENCES django_content_type (id) DEFERRABLE INITIALLY DEFERRED
                );
                """)
                
                # Recreate auth_group_permissions with BIGINT reference
                self.stdout.write("Recreating auth_group_permissions table...")
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS auth_group_permissions (
                    id BIGSERIAL PRIMARY KEY,
                    group_id UUID NOT NULL,
                    permission_id BIGINT NOT NULL,
                    CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq UNIQUE (group_id, permission_id),
                    CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id)
                        REFERENCES auth_group (id) DEFERRABLE INITIALLY DEFERRED,
                    CONSTRAINT auth_group_permissions_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id)
                        REFERENCES auth_permission (id) DEFERRABLE INITIALLY DEFERRED
                );
                """)
                
                # Recreate auth_user_user_permissions with BIGINT reference
                self.stdout.write("Recreating auth_user_user_permissions table...")
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS auth_user_user_permissions (
                    id BIGSERIAL PRIMARY KEY,
                    user_id UUID NOT NULL,
                    permission_id BIGINT NOT NULL,
                    CONSTRAINT auth_user_user_permissions_user_id_permission_id_14a6b632_uniq UNIQUE (user_id, permission_id),
                    CONSTRAINT auth_user_user_permissions_user_id_a95ead1b_fk_users_user_id FOREIGN KEY (user_id)
                        REFERENCES custom_auth_user (id) DEFERRABLE INITIALLY DEFERRED,
                    CONSTRAINT auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm FOREIGN KEY (permission_id)
                        REFERENCES auth_permission (id) DEFERRABLE INITIALLY DEFERRED
                );
                """)
                
                # Recreate django_site table with BIGSERIAL
                self.stdout.write("Recreating django_site table...")
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS django_site (
                    id BIGSERIAL PRIMARY KEY,
                    domain VARCHAR(100) NOT NULL,
                    name VARCHAR(50) NOT NULL,
                    CONSTRAINT django_site_domain_key UNIQUE (domain)
                );
                INSERT INTO django_site (domain, name) VALUES ('example.com', 'example.com')
                ON CONFLICT DO NOTHING;
                """)
                
                # Create socialaccount_socialapp table
                self.stdout.write("Recreating socialaccount_socialapp table...")
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS socialaccount_socialapp (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    provider VARCHAR(30) NOT NULL,
                    name VARCHAR(40) NOT NULL,
                    client_id VARCHAR(191) NOT NULL,
                    secret VARCHAR(191) NOT NULL,
                    key VARCHAR(191) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                """)
                
                # Recreate socialaccount_socialapp_sites with BIGINT reference
                self.stdout.write("Recreating socialaccount_socialapp_sites table...")
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS socialaccount_socialapp_sites (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    socialapp_id UUID NOT NULL REFERENCES socialaccount_socialapp(id),
                    site_id BIGINT NOT NULL REFERENCES django_site(id),
                    UNIQUE (socialapp_id, site_id)
                );
                """)
                
                # Recreate django_admin_log with BIGINT reference
                self.stdout.write("Recreating django_admin_log table...")
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS django_admin_log (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    action_time TIMESTAMP WITH TIME ZONE NOT NULL,
                    object_id TEXT NULL,
                    object_repr VARCHAR(200) NOT NULL,
                    action_flag SMALLINT NOT NULL CHECK (action_flag > 0),
                    change_message TEXT NOT NULL,
                    content_type_id BIGINT NULL REFERENCES django_content_type(id) DEFERRABLE INITIALLY DEFERRED,
                    user_id UUID NOT NULL REFERENCES custom_auth_user(id) DEFERRABLE INITIALLY DEFERRED
                );
                """)
                
                # Fill in the django_content_type table with default content types
                self.stdout.write("Populating django_content_type table...")
                cursor.execute("""
                INSERT INTO django_content_type (app_label, model) VALUES
                ('admin', 'logentry'),
                ('auth', 'permission'),
                ('auth', 'group'),
                ('contenttypes', 'contenttype'),
                ('sessions', 'session'),
                ('sites', 'site'),
                ('users', 'user'),
                ('users', 'business'),
                ('users', 'businessdetails'),
                ('users', 'userprofile'),
                ('users', 'subscription'),
                ('finance', 'account'),
                ('finance', 'accounttype'),
                ('finance', 'transaction'),
                ('inventory', 'product'),
                ('inventory', 'service'),
                ('inventory', 'category'),
                ('inventory', 'supplier'),
                ('custom_auth', 'tenant'),
                ('onboarding', 'onboardingprogress')
                ON CONFLICT DO NOTHING;
                """)
                
                # Commit the transaction
                cursor.execute("COMMIT;")
                self.stdout.write(self.style.SUCCESS("Content type mismatch fixed successfully!"))
                
            except Exception as e:
                # Rollback the transaction if there's an error
                cursor.execute("ROLLBACK;")
                self.stderr.write(self.style.ERROR(f"Error fixing content type mismatch: {e}"))
                raise