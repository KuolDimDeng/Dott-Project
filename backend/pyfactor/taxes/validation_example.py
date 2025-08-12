"""
Example: How to use the Tax Rate Validation System

This shows the complete workflow for validating tax rate updates
"""

# 1. Create a JSON file with tax updates (example_updates.json):
"""
{
    "US": {
        "country_name": "United States",
        "region_name": "California", 
        "rate": "0.0875",
        "tax_authority_name": "California Department of Revenue",
        "filing_frequency": "monthly",
        "filing_day_of_month": 20
    },
    "GB": {
        "country_name": "United Kingdom",
        "rate": "0.20",
        "tax_authority_name": "HM Revenue & Customs",
        "online_portal_url": "https://www.gov.uk/vat-online"
    }
}
"""

# 2. Load and validate the updates:
"""
python manage.py validate_tax_updates \
    --file=example_updates.json \
    --load \
    --validate \
    --report
"""

# 3. Review the validation report output:
"""
Loading data from example_updates.json...
Loaded 2 records into staging

Validating staged data...
Basic validation passed

Change Summary:
  Critical changes: 0
  Warning changes: 1
  Info changes: 3

Created batch: batch_20240803_143022

============================================================
TAX RATE VALIDATION REPORT
Batch ID: batch_20240803_143022
Created: 2024-08-03 14:30:22
Status: pending
============================================================

SUMMARY:
  Total changes: 4
  Countries affected: 2
  Critical changes: 0
  Warning changes: 1

CHANGES BY TYPE:
  Tax Rate Changed: 1
  Filing Info Updated: 3
============================================================
"""

# 4. Approve the batch:
"""
python manage.py validate_tax_updates \
    --batch-id=batch_20240803_143022 \
    --approve \
    --user=admin
"""

# 5. Apply to production:
"""
python manage.py validate_tax_updates \
    --batch-id=batch_20240803_143022 \
    --apply
"""

# 6. If needed, rollback:
"""
from taxes.services.tax_validation_service import TaxRateValidator
from taxes.models.tax_validation import TaxRateValidationBatch

batch = TaxRateValidationBatch.objects.get(batch_id='batch_20240803_143022')
validator = TaxRateValidator(batch.batch_id)
validator.rollback_batch(batch)
"""

# Programmatic usage:
"""
from taxes.services.tax_validation_service import TaxRateValidator
from taxes.models.tax_validation import GlobalSalesTaxRateStaging
from django.contrib.auth.models import User
from decimal import Decimal

# Create validator
validator = TaxRateValidator()

# Load data into staging
staging = GlobalSalesTaxRateStaging.objects.create(
    country='FR',
    country_name='France',
    tax_type='vat',
    rate=Decimal('0.20'),
    tax_authority_name='Direction Générale des Finances Publiques',
    filing_frequency='monthly',
    batch_id=validator.batch_id,
    effective_date=timezone.now().date()
)

# Validate
is_valid, errors = validator.validate_staging_data()

# Compare with production
changes = validator.compare_with_production()

# Create batch
user = User.objects.get(username='admin')
batch = validator.create_validation_batch(user)

# Review changes
print(f"Total changes: {batch.total_changes}")
print(f"Critical changes: {batch.critical_changes}")

# Approve and apply if everything looks good
if batch.critical_changes == 0:
    batch.status = 'approved'
    batch.reviewed_by = user
    batch.save()
    
    validator.apply_approved_changes(batch, user)
"""