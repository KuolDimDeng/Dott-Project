#!/bin/bash
# Script to test and monitor tenant migrations

# Set the working directory to the project root
cd "$(dirname "$0")/.."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Testing Tenant Migrations ===${NC}"
echo ""

# Test tenant migrations
python scripts/test_tenant_migrations.py

echo ""
echo -e "${GREEN}=== Checking for Specific Tenant ===${NC}"
echo ""

# Check if tenant ID is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}No tenant ID provided. To check a specific tenant, run:${NC}"
    echo "  $0 <tenant_id>"
else
    TENANT_ID=$1
    echo -e "${GREEN}Checking tenant: ${TENANT_ID}${NC}"
    
    # Check and migrate the specific tenant
    python scripts/check_and_migrate_tenant.py $TENANT_ID
    
    echo ""
    echo -e "${GREEN}=== Tenant Migration Status ===${NC}"
    
    # Get tenant status from database
    python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()
from custom_auth.models import Tenant
try:
    tenant = Tenant.objects.get(id='$TENANT_ID')
    print(f'Tenant: {tenant.name}')
    print(f'Schema: {tenant.schema_name}')
    print(f'Status: {tenant.database_status}')
    print(f'Setup Status: {tenant.setup_status}')
    if tenant.setup_error_message:
        print(f'Error: {tenant.setup_error_message}')
except Tenant.DoesNotExist:
    print('Tenant not found')
except Exception as e:
    print(f'Error: {str(e)}')
"
fi

echo ""
echo -e "${GREEN}=== Monitoring Celery Tasks ===${NC}"
echo ""
echo -e "${YELLOW}To monitor Celery tasks, run:${NC}"
echo "  celery -A pyfactor worker --loglevel=info"
echo ""
echo -e "${YELLOW}To run the Celery beat scheduler, run:${NC}"
echo "  celery -A pyfactor beat --loglevel=info"
echo ""
echo -e "${YELLOW}To manually trigger the migration task for all tenants, run:${NC}"
echo "  python -c \"
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()
from custom_auth.tasks import check_and_migrate_tenant_schemas
check_and_migrate_tenant_schemas.delay()
\""
echo ""
echo -e "${YELLOW}To manually trigger the migration task for a specific tenant, run:${NC}"
echo "  python -c \"
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()
from custom_auth.tasks import migrate_tenant_schema
migrate_tenant_schema.delay('<tenant_id>')
\""
echo ""