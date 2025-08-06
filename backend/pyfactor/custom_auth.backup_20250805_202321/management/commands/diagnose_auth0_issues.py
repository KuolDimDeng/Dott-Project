#!/usr/bin/env python
"""
Django Management Command to Diagnose Auth0 Authentication Issues
Run this on Render to check configuration and database state
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import connection
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
import os
import json

User = get_user_model()

class Command(BaseCommand):
    help = 'Diagnose Auth0 authentication issues in production'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Check specific user by email',
            default='jubacargovillage@gmail.com'
        )

    def handle(self, *args, **options):
        email = options['email']
        
        self.stdout.write("🔍 AUTH0 AUTHENTICATION DIAGNOSIS")
        self.stdout.write("=" * 50)
        
        # 1. Check Auth0 Environment Variables
        self.check_auth0_config()
        
        # 2. Check Database Migration Status
        self.check_migration_status()
        
        # 3. Check User Model Fields
        self.check_user_model()
        
        # 4. Check Specific User
        self.check_user_data(email)
        
        # 5. Check Database Tables
        self.check_database_tables()
        
        # 6. Test Database Connection
        self.test_database_connection()
        
        self.stdout.write("\n✅ DIAGNOSIS COMPLETE")

    def check_auth0_config(self):
        self.stdout.write("\n🔐 Auth0 Configuration:")
        self.stdout.write("-" * 30)
        
        auth0_vars = [
            'NEXT_PUBLIC_AUTH0_DOMAIN',
            'AUTH0_CLIENT_SECRET', 
            'NEXT_PUBLIC_AUTH0_CLIENT_ID',
            'AUTH0_SECRET'
        ]
        
        for var in auth0_vars:
            value = os.environ.get(var)
            if value:
                # Mask sensitive values
                if 'SECRET' in var:
                    display_value = f"{value[:8]}..." if len(value) > 8 else "***"
                else:
                    display_value = value
                self.stdout.write(f"  ✅ {var}: {display_value}")
            else:
                self.stdout.write(f"  ❌ {var}: NOT SET")

    def check_migration_status(self):
        self.stdout.write("\n📋 Migration Status:")
        self.stdout.write("-" * 25)
        
        with connection.cursor() as cursor:
            # Check if our migration was applied
            cursor.execute("""
                SELECT name, applied 
                FROM django_migrations 
                WHERE app = 'custom_auth' 
                ORDER BY applied DESC 
                LIMIT 5
            """)
            
            migrations = cursor.fetchall()
            
            if migrations:
                self.stdout.write("  Recent custom_auth migrations:")
                for name, applied in migrations:
                    self.stdout.write(f"    {name}: {applied}")
                    
                # Check specifically for our migration
                target_migration = '0006_remove_user_cognito_sub_user_email_verified_and_more'
                migration_applied = any(name == target_migration for name, _ in migrations)
                
                if migration_applied:
                    self.stdout.write(f"  ✅ Target migration {target_migration} IS APPLIED")
                else:
                    self.stdout.write(f"  ❌ Target migration {target_migration} NOT APPLIED")
            else:
                self.stdout.write("  ❌ No custom_auth migrations found")

    def check_user_model(self):
        self.stdout.write("\n👤 User Model Fields:")
        self.stdout.write("-" * 25)
        
        user_fields = [field.name for field in User._meta.get_fields()]
        
        required_fields = ['name', 'picture', 'email_verified', 'auth0_sub']
        
        for field in required_fields:
            if field in user_fields:
                self.stdout.write(f"  ✅ {field}: EXISTS")
            else:
                self.stdout.write(f"  ❌ {field}: MISSING")
        
        self.stdout.write(f"  📊 Total User model fields: {len(user_fields)}")

    def check_user_data(self, email):
        self.stdout.write(f"\n👥 User Data for {email}:")
        self.stdout.write("-" * 30)
        
        try:
            user = User.objects.get(email=email)
            
            # Check user fields
            user_data = {
                'id': user.pk,
                'email': user.email,
                'auth0_sub': getattr(user, 'auth0_sub', 'MISSING'),
                'name': getattr(user, 'name', 'MISSING'),
                'picture': getattr(user, 'picture', 'MISSING'),
                'email_verified': getattr(user, 'email_verified', 'MISSING'),
                'is_active': user.is_active,
            }
            
            for key, value in user_data.items():
                if value == 'MISSING':
                    self.stdout.write(f"  ❌ {key}: MISSING FIELD")
                else:
                    # Truncate long values
                    if isinstance(value, str) and len(str(value)) > 50:
                        display_value = f"{str(value)[:47]}..."
                    else:
                        display_value = value
                    self.stdout.write(f"  ✅ {key}: {display_value}")
                    
            # Check tenant
            try:
                tenant = Tenant.objects.filter(owner_id=user.pk).first()
                if tenant:
                    self.stdout.write(f"  ✅ tenant_id: {tenant.id}")
                    self.stdout.write(f"  ✅ tenant_name: {tenant.name}")
                else:
                    self.stdout.write(f"  ❌ tenant: NO TENANT FOUND")
            except Exception as e:
                self.stdout.write(f"  ❌ tenant_check_error: {e}")
                
            # Check onboarding progress  
            try:
                progress = OnboardingProgress.objects.filter(user=user).first()
                if progress:
                    self.stdout.write(f"  ✅ onboarding_status: {progress.onboarding_status}")
                    self.stdout.write(f"  ✅ setup_completed: {progress.setup_completed}")
                else:
                    self.stdout.write(f"  ❌ onboarding_progress: NOT FOUND")
            except Exception as e:
                self.stdout.write(f"  ❌ onboarding_check_error: {e}")
                
        except User.DoesNotExist:
            self.stdout.write(f"  ❌ User with email {email} NOT FOUND")
        except Exception as e:
            self.stdout.write(f"  ❌ Error checking user: {e}")

    def check_database_tables(self):
        self.stdout.write("\n🗄️  Database Tables:")
        self.stdout.write("-" * 25)
        
        tables_to_check = [
            'custom_auth_user',
            'custom_auth_tenant', 
            'onboarding_onboardingprogress',
            'django_migrations'
        ]
        
        with connection.cursor() as cursor:
            for table in tables_to_check:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    result = cursor.fetchone()
                    count = result[0] if result else 0
                    self.stdout.write(f"  ✅ {table}: {count} records")
                except Exception as e:
                    self.stdout.write(f"  ❌ {table}: ERROR - {e}")

    def test_database_connection(self):
        self.stdout.write("\n🔗 Database Connection:")
        self.stdout.write("-" * 25)
        
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT version()")
                result = cursor.fetchone()
                version = result[0] if result else "Unknown"
                self.stdout.write(f"  ✅ PostgreSQL Version: {version}")
                
                cursor.execute("SELECT current_database()")
                result = cursor.fetchone()
                db_name = result[0] if result else "Unknown"
                self.stdout.write(f"  ✅ Database Name: {db_name}")
                
                cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
                result = cursor.fetchone()
                table_count = result[0] if result else 0
                self.stdout.write(f"  ✅ Total Tables: {table_count}")
                
        except Exception as e:
            self.stdout.write(f"  ❌ Database connection error: {e}") 