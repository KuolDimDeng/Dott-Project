#!/bin/bash
# Optimize database connections
echo "Optimizing database connections..."

# Check database connectivity
python << 'PYTHON'
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings_eb')
django.setup()

from django.db import connection
try:
    cursor = connection.cursor()
    cursor.execute("SELECT 1")
    print("✅ Database connection successful")
except Exception as e:
    print(f"❌ Database connection failed: {e}")
PYTHON

# Clear any stuck connections
docker exec $(docker ps -q) python manage.py dbshell --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND state_change < now() - interval '5 minutes';" || true

echo "Database optimization complete"
