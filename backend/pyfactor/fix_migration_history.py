"""
Script to fix inconsistent migration history in production.
Run this on the production server to fake apply the missing migration.
"""

from django.core.management import execute_from_command_line
import sys

# Fake apply the missing migration that should have been applied before 0005
sys.argv = ['manage.py', 'migrate', 'users', '0004_add_business_type_column', '--fake']
execute_from_command_line(sys.argv)

print("Fixed migration history - 0004_add_business_type_column marked as applied")

# Now apply the remaining migrations normally
sys.argv = ['manage.py', 'migrate', 'users']
execute_from_command_line(sys.argv)

print("All users migrations applied successfully")

# Apply inventory migration
sys.argv = ['manage.py', 'migrate', 'inventory', '0006_add_location_to_product']
execute_from_command_line(sys.argv)

print("Inventory location migration applied successfully")