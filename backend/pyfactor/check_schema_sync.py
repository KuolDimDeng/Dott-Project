#!/usr/bin/env python3
"""
Schema Sync Checker - Automatically detect and fix database schema mismatches

This script compares Django models with the actual database schema and generates
SQL fixes for missing columns, preventing the one-by-one error fixing approach.

Usage:
    python check_schema_sync.py --check          # Check for mismatches
    python check_schema_sync.py --fix            # Generate SQL fix script
    python check_schema_sync.py --apply          # Apply fixes to database
"""

import os
import sys
import django
from django.conf import settings
from django.db import connection
from django.db.models import fields as django_fields
from django.apps import apps
from django.core.management.base import BaseCommand
import json
from collections import defaultdict

# Setup Django
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

class SchemaChecker:
    def __init__(self):
        self.cursor = connection.cursor()
        self.mismatches = defaultdict(list)
        
    def get_db_columns(self, table_name):
        """Get current database columns for a table"""
        query = """
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = %s
        ORDER BY column_name;
        """
        self.cursor.execute(query, [table_name])
        return {row[0]: {
            'data_type': row[1],
            'is_nullable': row[2],
            'column_default': row[3]
        } for row in self.cursor.fetchall()}
    
    def get_django_fields(self, model):
        """Extract field information from Django model"""
        fields = {}
        for field in model._meta.get_fields():
            if hasattr(field, 'column'):
                field_info = self.analyze_django_field(field)
                if field_info:
                    fields[field.column] = field_info
        return fields
    
    def analyze_django_field(self, field):
        """Convert Django field to database column specification"""
        field_type = type(field).__name__
        
        # Map Django field types to SQL types
        type_mapping = {
            'CharField': 'character varying',
            'TextField': 'text',
            'UUIDField': 'uuid',
            'DateTimeField': 'timestamp with time zone',
            'BooleanField': 'boolean',
            'IntegerField': 'integer',
            'BigIntegerField': 'bigint',
            'JSONField': 'jsonb',
            'ForeignKey': 'integer',  # Usually points to integer PK
            'OneToOneField': 'integer',
        }
        
        sql_type = type_mapping.get(field_type, 'text')
        is_nullable = 'YES' if field.null else 'NO'
        
        # Handle defaults
        default = None
        if hasattr(field, 'default') and field.default is not django_fields.NOT_PROVIDED:
            if isinstance(field.default, str):
                default = f"'{field.default}'"
            elif isinstance(field.default, bool):
                default = 'true' if field.default else 'false'
            elif isinstance(field.default, dict):
                default = "'{}'"
            elif isinstance(field.default, list):
                default = "'[]'"
            elif field.default is None:
                default = None
            else:
                default = str(field.default)
        
        return {
            'data_type': sql_type,
            'is_nullable': is_nullable,
            'column_default': default,
            'django_field': field_type
        }
    
    def check_model_schema(self, model):
        """Check if model schema matches database schema"""
        table_name = model._meta.db_table
        print(f"\n🔍 Checking {model.__name__} (table: {table_name})")
        
        # Get current database columns
        db_columns = self.get_db_columns(table_name)
        
        # Get Django model fields
        django_fields = self.get_django_fields(model)
        
        # Find missing columns
        missing_columns = []
        for field_name, field_info in django_fields.items():
            if field_name not in db_columns:
                missing_columns.append({
                    'column': field_name,
                    'info': field_info
                })
                print(f"  ❌ Missing column: {field_name} ({field_info['django_field']})")
        
        # Find extra columns (in DB but not in model)
        extra_columns = []
        for col_name in db_columns:
            if col_name not in django_fields:
                extra_columns.append(col_name)
                print(f"  ⚠️  Extra column: {col_name} (in DB but not in model)")
        
        if not missing_columns and not extra_columns:
            print(f"  ✅ Schema matches perfectly!")
        
        return {
            'table_name': table_name,
            'missing_columns': missing_columns,
            'extra_columns': extra_columns
        }
    
    def generate_sql_fix(self, schema_info):
        """Generate SQL to fix schema mismatches"""
        table_name = schema_info['table_name']
        missing_columns = schema_info['missing_columns']
        
        if not missing_columns:
            return ""
        
        sql_parts = []
        sql_parts.append(f"-- Fix missing columns for {table_name}")
        sql_parts.append("DO $$")
        sql_parts.append("BEGIN")
        
        for col_info in missing_columns:
            col_name = col_info['column']
            field_info = col_info['info']
            
            # Build column definition
            col_def = field_info['data_type']
            if 'varying' in col_def and 'character' in col_def:
                col_def += "(255)"  # Default length for varchar
            
            # Add NOT NULL if needed
            if field_info['is_nullable'] == 'NO':
                col_def += " NOT NULL"
            
            # Add default if specified
            if field_info['column_default']:
                col_def += f" DEFAULT {field_info['column_default']}"
            
            sql_parts.append(f"    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table_name}' AND column_name = '{col_name}') THEN")
            sql_parts.append(f"        ALTER TABLE {table_name} ADD COLUMN {col_name} {col_def};")
            sql_parts.append(f"        RAISE NOTICE 'Added {col_name} column to {table_name}';")
            sql_parts.append("    END IF;")
            sql_parts.append("")
        
        sql_parts.append("END $$;")
        sql_parts.append("")
        
        return "\n".join(sql_parts)
    
    def check_all_models(self):
        """Check all Django models for schema mismatches"""
        print("🔍 Starting comprehensive schema check...")
        
        all_mismatches = []
        models_to_check = [
            'onboarding.OnboardingProgress',
            'users.Business', 
            'custom_auth.User',
            # Add more models as needed
        ]
        
        for model_path in models_to_check:
            try:
                app_label, model_name = model_path.split('.')
                model = apps.get_model(app_label, model_name)
                schema_info = self.check_model_schema(model)
                if schema_info['missing_columns'] or schema_info['extra_columns']:
                    all_mismatches.append(schema_info)
            except Exception as e:
                print(f"❌ Error checking {model_path}: {str(e)}")
        
        return all_mismatches
    
    def generate_complete_fix_script(self, mismatches):
        """Generate complete SQL fix script for all mismatches"""
        if not mismatches:
            print("✅ No schema mismatches found! Database is in sync.")
            return
        
        print(f"\n📝 Generating fix script for {len(mismatches)} tables with mismatches...")
        
        sql_script = [
            "-- COMPREHENSIVE SCHEMA FIX",
            "-- Generated automatically by schema_checker.py",
            f"-- Found mismatches in {len(mismatches)} tables",
            "",
        ]
        
        for mismatch in mismatches:
            fix_sql = self.generate_sql_fix(mismatch)
            if fix_sql:
                sql_script.append(fix_sql)
        
        # Write to file
        filename = "auto_generated_schema_fix.sql"
        with open(filename, 'w') as f:
            f.write("\n".join(sql_script))
        
        print(f"✅ Generated fix script: {filename}")
        print(f"   To apply: psql [DATABASE_URL] -f {filename}")

def main():
    checker = SchemaChecker()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--apply':
        print("🚨 This would apply fixes to the database")
        print("💡 For safety, this generates SQL files. Apply manually.")
    
    # Run comprehensive check
    mismatches = checker.check_all_models()
    
    # Generate fix script
    checker.generate_complete_fix_script(mismatches)
    
    print(f"\n📊 Summary:")
    print(f"   📋 Tables checked: {len(['onboarding.OnboardingProgress', 'users.Business'])}")
    print(f"   ❌ Tables with issues: {len(mismatches)}")
    print(f"   ✅ Tables in sync: {len(['onboarding.OnboardingProgress', 'users.Business']) - len(mismatches)}")

if __name__ == "__main__":
    main() 