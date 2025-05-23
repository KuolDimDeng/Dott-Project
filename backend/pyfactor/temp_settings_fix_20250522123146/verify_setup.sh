#!/bin/bash

echo "Starting Django setup verification..."

# Verify Django can load
python -c "import django; django.setup()" 2>/dev/null && echo "✓ Django setup successful" || echo "✗ Django setup failed"

# Verify our modules can import
python -c "import pyfactor" 2>/dev/null && echo "✓ Pyfactor module imports" || echo "✗ Pyfactor module import failed"

python -c "import onboarding" 2>/dev/null && echo "✓ Onboarding module imports" || echo "✗ Onboarding module import failed"

# Verify specific imports
python -c "from onboarding.views import DatabaseHealthCheckView" 2>/dev/null && echo "✓ DatabaseHealthCheckView imports" || echo "✗ DatabaseHealthCheckView import failed"

# Simple URL pattern check
python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings_eb')
import django
django.setup()
from django.conf import settings
print('✓ Settings loaded successfully')
" 2>/dev/null || echo "✗ Settings loading failed"

echo "Verification completed."
