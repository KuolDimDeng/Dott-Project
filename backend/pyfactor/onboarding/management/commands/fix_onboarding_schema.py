"""
Django management command to fix onboarding_onboardingprogress table schema
Converts integer ID to UUID to fix production database issues
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.conf import settings
import sys


class Command(BaseCommand):
    help = 'Fix onboarding_onboardingprogress table schema (integer ID → UUID ID)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force the migration even in production',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without executing',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.WARNING('🚀 Onboarding Schema Fix Command')
        )
        self.stdout.write('=' * 50)

        # Safety checks
        if not options['force'] and not settings.DEBUG:
            raise CommandError(
                '⚠️  This is a production environment. Use --force to proceed.\n'
                'Example: python manage.py fix_onboarding_schema --force'
            )

        if options['dry_run']:
            self.stdout.write(
                self.style.NOTICE('🔍 DRY RUN MODE - No changes will be made')
            )

        try:
            # Check current schema
            current_schema = self.check_current_schema()
            
            if current_schema == 'uuid':
                self.stdout.write(
                    self.style.SUCCESS('✅ Schema is already correct (UUID)')
                )
                return
            elif current_schema == 'integer':
                self.stdout.write(
                    self.style.WARNING('❌ Found integer schema - needs fixing')
                )
            else:
                self.stdout.write(
                    self.style.ERROR('❓ Could not determine current schema')
                )
                return

            # Apply the fix
            if not options['dry_run']:
                self.apply_schema_fix()
                self.stdout.write(
                    self.style.SUCCESS('🎉 Schema fix completed successfully!')
                )
            else:
                self.stdout.write(
                    self.style.NOTICE('📋 Would apply schema fix (dry run)')
                )

            # Verify the fix
            if not options['dry_run']:
                self.verify_fix()

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error: {str(e)}')
            )
            raise CommandError(f'Schema fix failed: {str(e)}')

    def check_current_schema(self):
        """Check the current schema of the table"""
        self.stdout.write('🔍 Checking current table schema...')
        
        with connection.cursor() as cursor:
            # Check if table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'onboarding_onboardingprogress'
                );
            """)
            
            table_exists = cursor.fetchone()
            if not table_exists or not table_exists[0]:
                self.stdout.write('📋 Table does not exist - will create with UUID')
                return 'none'
            
            # Check ID field type
            cursor.execute("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'onboarding_onboardingprogress' 
                AND column_name = 'id';
            """)
            
            result = cursor.fetchone()
            if result:
                data_type = result[0].lower()
                self.stdout.write(f'📋 Current ID field type: {data_type}')
                
                if data_type in ['integer', 'serial', 'bigserial']:
                    return 'integer'
                elif data_type == 'uuid':
                    return 'uuid'
            
            return 'unknown'

    def apply_schema_fix(self):
        """Apply the schema fix"""
        self.stdout.write('🔧 Applying schema fix...')
        
        schema_sql = """
        -- Step 1: Check if table exists and drop it
        DO $$ 
        BEGIN
            IF EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'onboarding_onboardingprogress'
            ) THEN
                RAISE NOTICE 'Dropping existing table...';
                DROP TABLE IF EXISTS onboarding_onboardingprogress CASCADE;
            END IF;
        END $$;

        -- Step 2: Create table with UUID schema
        CREATE TABLE onboarding_onboardingprogress (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            session_id UUID NULL,
            last_session_activity TIMESTAMP WITH TIME ZONE NULL,
            onboarding_status VARCHAR(50) NOT NULL DEFAULT 'business_info',
            account_status VARCHAR(20) NOT NULL DEFAULT 'pending',
            user_role VARCHAR(20) NOT NULL DEFAULT 'owner',
            subscription_plan VARCHAR(20) NOT NULL DEFAULT 'free',
            current_step VARCHAR(50) NOT NULL DEFAULT 'business_info',
            next_step VARCHAR(50) NOT NULL DEFAULT 'subscription',
            completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
            last_active_step VARCHAR(256) NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            last_login TIMESTAMP WITH TIME ZONE NULL,
            access_token_expiration TIMESTAMP WITH TIME ZONE NULL,
            completed_at TIMESTAMP WITH TIME ZONE NULL,
            database_setup_task_id VARCHAR(255) NULL,
            selected_plan VARCHAR(20) NOT NULL DEFAULT 'free',
            subscription_status VARCHAR(20) NULL,
            billing_cycle VARCHAR(20) NULL DEFAULT 'monthly',
            payment_completed BOOLEAN NOT NULL DEFAULT FALSE,
            payment_method VARCHAR(50) NULL,
            payment_id VARCHAR(100) NULL,
            payment_timestamp TIMESTAMP WITH TIME ZONE NULL,
            rls_setup_completed BOOLEAN NOT NULL DEFAULT FALSE,
            rls_setup_timestamp TIMESTAMP WITH TIME ZONE NULL,
            setup_completed BOOLEAN NOT NULL DEFAULT FALSE,
            setup_timestamp TIMESTAMP WITH TIME ZONE NULL,
            setup_error TEXT NULL,
            schema_name VARCHAR(63) NULL,
            metadata JSONB NULL DEFAULT '{}'::jsonb,
            attribute_version VARCHAR(10) NOT NULL DEFAULT '1.0.0',
            preferences JSONB NULL DEFAULT '{}'::jsonb,
            user_id UUID NOT NULL,
            business_id UUID NULL
        );

        -- Step 3: Create indexes
        CREATE INDEX onboard_tenant_idx ON onboarding_onboardingprogress(tenant_id);
        CREATE INDEX onboard_user_idx ON onboarding_onboardingprogress(user_id);
        CREATE INDEX onboard_session_idx ON onboarding_onboardingprogress(session_id);
        CREATE INDEX onboard_status_idx ON onboarding_onboardingprogress(onboarding_status);

        -- Step 4: Update migrations table
        INSERT INTO django_migrations (app, name, applied)
        VALUES ('onboarding', '0003_fix_uuid_schema', NOW())
        ON CONFLICT DO NOTHING;
        """

        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(schema_sql)
        
        self.stdout.write('✅ Schema fix applied successfully')

    def verify_fix(self):
        """Verify the fix worked"""
        self.stdout.write('✅ Verifying fix...')
        
        try:
            from onboarding.models import OnboardingProgress
            
            # Test model access
            count = OnboardingProgress.objects.count()
            self.stdout.write(f'✅ OnboardingProgress model working! Records: {count}')
            
            # Check schema one more time
            final_schema = self.check_current_schema()
            if final_schema == 'uuid':
                self.stdout.write('✅ Schema verification passed')
            else:
                self.stdout.write(f'❌ Schema verification failed: {final_schema}')
                
        except Exception as e:
            self.stdout.write(f'❌ Verification failed: {str(e)}')
            raise 