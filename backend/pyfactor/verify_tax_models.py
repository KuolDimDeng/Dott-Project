#!/usr/bin/env python
"""
Verify tax models are correctly configured
"""

import re

def verify_tax_models():
    with open('/Users/kuoldeng/projectx/backend/pyfactor/taxes/models.py', 'r') as f:
        content = f.read()
    
    issues = []
    
    # Check for ordering with created_at where model has created field
    lines = content.split('\n')
    
    # Track current model and its fields
    current_model = None
    model_fields = {}
    
    for i, line in enumerate(lines):
        # Detect model class definition
        if match := re.match(r'class (\w+)\(.*TenantAwareModel.*\):', line):
            current_model = match.group(1)
            model_fields[current_model] = {
                'has_created': False,
                'has_created_at': False,
                'has_updated': False,
                'has_updated_at': False,
                'ordering': None,
                'indexes': []
            }
        
        # Check for field definitions
        if current_model:
            if 'created = models.DateTimeField' in line:
                model_fields[current_model]['has_created'] = True
            if 'created_at = models.DateTimeField' in line:
                model_fields[current_model]['has_created_at'] = True
            if 'updated = models.DateTimeField' in line:
                model_fields[current_model]['has_updated'] = True
            if 'updated_at = models.DateTimeField' in line:
                model_fields[current_model]['has_updated_at'] = True
            
            # Check ordering
            if match := re.search(r"ordering = \[(.*?)\]", line):
                model_fields[current_model]['ordering'] = match.group(1)
            
            # Check indexes
            if 'models.Index(fields=' in line:
                model_fields[current_model]['indexes'].append(line.strip())
    
    # Verify consistency
    print("Model Verification Report")
    print("=" * 60)
    
    for model, info in model_fields.items():
        problems = []
        
        # Check if model has timestamp fields
        if not info['has_created'] and not info['has_created_at']:
            problems.append("Missing created timestamp field")
        if not info['has_updated'] and not info['has_updated_at'] and model not in ['TaxSignatureDocument', 'TaxSignatureAuditLog', 'TaxSignatureWebhook', 'TaxDataEntryLog']:
            problems.append("Missing updated timestamp field")
        
        # Check ordering consistency
        if info['ordering']:
            if "'created_at'" in info['ordering'] and info['has_created'] and not info['has_created_at']:
                problems.append(f"Ordering uses 'created_at' but model has 'created' field")
            if "'created'" in info['ordering'] and info['has_created_at'] and not info['has_created']:
                problems.append(f"Ordering uses 'created' but model has 'created_at' field")
        
        # Check index consistency
        for index in info['indexes']:
            if "'created_at'" in index and info['has_created'] and not info['has_created_at']:
                problems.append(f"Index uses 'created_at' but model has 'created' field")
            if "'created'" in index and info['has_created_at'] and not info['has_created']:
                problems.append(f"Index uses 'created' but model has 'created_at' field")
        
        if problems:
            print(f"\n{model}:")
            print(f"  Fields: created={info['has_created']}, created_at={info['has_created_at']}, "
                  f"updated={info['has_updated']}, updated_at={info['has_updated_at']}")
            if info['ordering']:
                print(f"  Ordering: {info['ordering']}")
            for problem in problems:
                print(f"  ❌ {problem}")

if __name__ == "__main__":
    verify_tax_models()