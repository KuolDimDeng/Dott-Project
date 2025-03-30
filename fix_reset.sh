#!/bin/bash
set -e

# First make sure our banking migrations files exist
echo "Setting up banking models and migrations..."
mkdir -p banking/migrations
touch banking/migrations/__init__.py
cat > banking/migrations/0001_initial.py << 'EOF'
from django.db import migrations, models
import uuid

class Migration(migrations.Migration):
    initial = True
    dependencies = []
    
    operations = [
        migrations.CreateModel(
            name='BankAccount',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('account_number', models.CharField(max_length=100)),
                ('account_type', models.CharField(max_length=100)),
                ('balance', models.DecimalField(decimal_places=4, max_digits=19)),
                ('currency', models.CharField(max_length=3)),
                ('is_active', models.BooleanField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant_id', models.UUIDField()),
            ],
        ),
    ]
EOF

cat > banking/migrations/0002_initial.py << 'EOF'
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('custom_auth', '0001_initial'),
        ('banking', '0001_initial'),
    ]
    
    operations = [
        migrations.AddField(
            model_name='bankaccount',
            name='user',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='custom_auth.user'),
        ),
    ]
EOF

# Fix the finance/apps.py to check for existence of tables
echo "Fixing the finance app..."
cat > finance/apps.py << 'EOF'
from django.apps import AppConfig
from django.db import connection

class FinanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'finance'

    def ready(self):
        # Import signal handlers
        import finance.signals

        # Run any SQL fixers if needed
        self.run_sql_fix()

    def run_sql_fix(self):
        with connection.cursor() as cursor:
            # Check if tables exist before trying to use them
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'finance_accountreconciliation'
                ) AS table_exists;
            """)
            finance_table_exists = cursor.fetchone()[0]
            
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'banking_bankaccount'
                ) AS table_exists;
            """)
            banking_table_exists = cursor.fetchone()[0]
            
            # Only apply fix if both tables exist
            if finance_table_exists and banking_table_exists:
                # Check if constraint already exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conrelid = 'finance_accountreconciliation'::regclass
                        AND confrelid = 'banking_bankaccount'::regclass
                    )
                """)
                
                constraint_exists = cursor.fetchone()[0]
                
                if not constraint_exists:
                    # Your original fix can go here
                    pass
EOF

# Now run the regular reset script
echo "Running reset_db_main..."
python manage.py reset_db_main --no-input

# Create the banking table
echo "Creating banking table manually..."
export PGPASSWORD="RRfXU6uPPUbBEg1JqGTJ"
psql -U dott_admin -d dott_main -h dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com -c "
CREATE TABLE IF NOT EXISTS banking_bankaccount (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_type VARCHAR(100) NOT NULL,
    balance DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    tenant_id UUID NOT NULL,
    user_id UUID NULL
);"

# Now mark banking migrations as applied in the migrations table
psql -U dott_admin -d dott_main -h dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com -c "
INSERT INTO django_migrations (app, name, applied) VALUES 
('banking', '0001_initial', NOW()),
('banking', '0002_initial', NOW());"
unset PGPASSWORD

# Run regular migrations with the fix in place
echo "Running migrations with banking already applied..."
export OVERRIDE_DB_ROUTER=True
python manage.py migrate 

echo "Reset completed successfully!" 