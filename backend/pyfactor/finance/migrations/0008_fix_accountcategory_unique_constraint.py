# Generated to fix AccountCategory unique constraint issue
# The code field should only be unique per tenant, not globally

from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0007_account_unique_account_number_per_tenant_and_more'),
    ]

    operations = [
        # Remove the old global unique constraint on code field if it exists
        migrations.RunSQL(
            sql="ALTER TABLE finance_accountcategory DROP CONSTRAINT IF EXISTS finance_accountcategory_code_key;",
            reverse_sql="ALTER TABLE finance_accountcategory ADD CONSTRAINT finance_accountcategory_code_key UNIQUE (code);",
            state_operations=[],
        ),
        # Also remove any duplicate unique index that might exist
        migrations.RunSQL(
            sql="DROP INDEX IF EXISTS finance_accountcategory_code_like;",
            reverse_sql="CREATE INDEX finance_accountcategory_code_like ON finance_accountcategory (code varchar_pattern_ops);",
            state_operations=[],
        ),
    ]
EOF < /dev/null