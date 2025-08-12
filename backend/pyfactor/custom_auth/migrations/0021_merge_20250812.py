# Generated manually to resolve migration conflicts
from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0002_add_rls_policies'),
        ('custom_auth', '0020_fix_passwordresettoken_migration_name'),
        ('custom_auth', '0999_universal_tenant_isolation'),
    ]

    operations = [
    ]