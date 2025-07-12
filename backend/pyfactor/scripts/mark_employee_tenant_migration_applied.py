#!/usr/bin/env python
"""
Mark the employee tenant_id migration as applied
This prevents Django from trying to run it again and failing
"""
import os
import sys
import django
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def mark_migration_applied():
    """Mark the hr.0013_employee_tenant_id migration as applied"""
    from django.db.migrations.recorder import MigrationRecorder
    
    print('🔧 Checking if hr.0013_employee_tenant_id migration is marked as applied...')
    
    recorder = MigrationRecorder(connection)
    applied_migrations = recorder.applied_migrations()
    
    if ('hr', '0013_employee_tenant_id') in applied_migrations:
        print('✅ Migration already marked as applied')
        return
    
    print('📝 Marking migration as applied...')
    recorder.record_applied('hr', '0013_employee_tenant_id')
    print('✅ Migration marked as applied')

if __name__ == '__main__':
    mark_migration_applied()