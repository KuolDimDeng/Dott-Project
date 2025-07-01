#!/usr/bin/env python
"""
Simple model validation script to test Django models locally
without running full Django setup.
"""

import os
import sys
import django
from django.conf import settings

# Add the project directory to the Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Minimal Django setup for model testing
if not settings.configured:
    settings.configure(
        INSTALLED_APPS=[
            'django.contrib.contenttypes',
            'django.contrib.auth',
            'taxes',
            'custom_auth',
            'audit',
            'purchases',
        ],
        DATABASES={
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': ':memory:',
            }
        },
        USE_TZ=True,
        SECRET_KEY='test-key-for-validation'
    )

django.setup()

def test_model_imports():
    """Test that all models can be imported without syntax errors"""
    try:
        from taxes.models import (
            TaxFiling, FilingDocument, State, TaxForm,
            PayrollTaxFiling, TaxApiTransaction, TaxFilingInstruction,
            FilingStatusHistory, StateFilingRequirement, FilingCalculation,
            FilingPayment
        )
        print("✅ Core tax models imported successfully")
        
        from taxes.multistate.models import (
            MultistateNexusProfile, StateNexusStatus, BusinessActivity,
            ApportionmentFactors, MultistateReturn, StateReturnFiling,
            NexusThresholdMonitoring
        )
        print("✅ Multistate models imported successfully")
        
        from custom_auth.tenant_base_model import TenantAwareModel
        print("✅ TenantAwareModel imported successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Model import failed: {e}")
        return False

def test_model_fields():
    """Test that models have required timestamp fields"""
    try:        
        from taxes.models import TaxFiling
        from taxes.multistate.models import NexusThresholdMonitoring
        
        # Check TaxFiling has proper fields
        filing_fields = [f.name for f in TaxFiling._meta.fields]
        if 'created' not in filing_fields:
            print("❌ TaxFiling missing 'created' field")
            return False
        if 'updated' not in filing_fields:
            print("❌ TaxFiling missing 'updated' field") 
            return False
            
        # Check NexusThresholdMonitoring ordering
        ordering = NexusThresholdMonitoring._meta.ordering
        if '-created_at' in ordering:
            print("❌ NexusThresholdMonitoring still references 'created_at' in ordering")
            return False
            
        print("✅ Model field validation passed")
        return True
        
    except Exception as e:
        print(f"❌ Model field validation failed: {e}")
        return False

if __name__ == '__main__':
    print("🔍 Testing Django models...")
    
    success = True
    success &= test_model_imports()
    success &= test_model_fields()
    
    if success:
        print("🎉 All model tests passed!")
        sys.exit(0)
    else:
        print("💥 Model tests failed!")
        sys.exit(1)