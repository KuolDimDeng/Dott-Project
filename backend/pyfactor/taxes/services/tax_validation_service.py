"""
Tax Rate Validation Service
Handles validation, comparison, and approval of tax rate changes
"""
from decimal import Decimal
from typing import Dict, List, Tuple
from django.db import transaction as db_transaction
from django.utils import timezone
import logging

from taxes.models import GlobalSalesTaxRate
from taxes.models.tax_validation import (
    TaxRateChangeLog, 
    TaxRateValidationBatch,
    GlobalSalesTaxRateStaging
)

logger = logging.getLogger(__name__)


class TaxRateValidator:
    """Simple, secure validation for tax rate changes"""
    
    # Validation thresholds
    RATE_CHANGE_THRESHOLDS = {
        'minor': Decimal('0.005'),     # 0.5%
        'moderate': Decimal('0.02'),   # 2%
        'major': Decimal('0.05'),      # 5%
        'critical': Decimal('0.10')    # 10%
    }
    
    # Valid ranges
    VALID_TAX_RATE_RANGE = (Decimal('0'), Decimal('0.50'))  # 0% to 50%
    VALID_FILING_DAYS = range(1, 32)  # 1-31
    VALID_FREQUENCIES = ['monthly', 'bi_monthly', 'quarterly', 'annual']
    
    def __init__(self, batch_id: str = None):
        self.batch_id = batch_id or f"batch_{timezone.now().strftime('%Y%m%d_%H%M%S')}"
        self.changes = []
        self.errors = []
        
    def validate_staging_data(self) -> Tuple[bool, List[str]]:
        """Validate all records in staging table for a batch"""
        staging_records = GlobalSalesTaxRateStaging.objects.filter(batch_id=self.batch_id)
        
        for record in staging_records:
            # Basic validation
            errors = self._validate_record(record)
            if errors:
                self.errors.extend(errors)
                record.validation_status = 'failed'
                record.validation_notes = '\n'.join(errors)
            else:
                record.validation_status = 'passed'
            record.save()
        
        return len(self.errors) == 0, self.errors
    
    def _validate_record(self, record) -> List[str]:
        """Validate individual record"""
        errors = []
        
        # Rate validation
        if not (self.VALID_TAX_RATE_RANGE[0] <= record.rate <= self.VALID_TAX_RATE_RANGE[1]):
            errors.append(f"Tax rate {record.rate*100}% outside valid range 0-50%")
        
        # Filing day validation
        if record.filing_day_of_month and record.filing_day_of_month not in self.VALID_FILING_DAYS:
            errors.append(f"Filing day {record.filing_day_of_month} invalid (must be 1-31)")
        
        # Filing frequency validation
        if record.filing_frequency and record.filing_frequency not in self.VALID_FREQUENCIES:
            errors.append(f"Filing frequency '{record.filing_frequency}' not valid")
        
        # URL validation
        if record.online_filing_available and not record.online_portal_url:
            errors.append("Online filing marked available but no portal URL provided")
        
        # Fee validation
        if record.manual_filing_fee < 0 or record.online_filing_fee < 0:
            errors.append("Filing fees cannot be negative")
        
        return errors
    
    def compare_with_production(self) -> Dict[str, List[Dict]]:
        """Compare staging records with production and log changes"""
        staging_records = GlobalSalesTaxRateStaging.objects.filter(
            batch_id=self.batch_id,
            validation_status='passed'
        )
        
        changes_by_severity = {
            'critical': [],
            'warning': [],
            'info': []
        }
        
        for staging in staging_records:
            # Find matching production record
            try:
                production = GlobalSalesTaxRate.objects.get(
                    country=staging.country,
                    region_code=staging.region_code,
                    locality=staging.locality,
                    is_current=True
                )
                
                # Compare and log changes
                changes = self._compare_records(production, staging)
                for change in changes:
                    changes_by_severity[change['severity']].append(change)
                    
            except GlobalSalesTaxRate.DoesNotExist:
                # New rate
                change = self._log_change(
                    staging, 'new_rate', 'rate',
                    None, str(staging.rate),
                    severity='warning'
                )
                changes_by_severity['warning'].append(change)
        
        return changes_by_severity
    
    def _compare_records(self, prod, staging) -> List[Dict]:
        """Compare production and staging records field by field"""
        changes = []
        
        # Rate changes
        if prod.rate != staging.rate:
            change_pct = abs((staging.rate - prod.rate) / prod.rate * 100)
            severity = self._get_rate_change_severity(change_pct)
            
            changes.append(self._log_change(
                staging, 'rate_change', 'rate',
                str(prod.rate), str(staging.rate),
                severity=severity,
                change_percentage=change_pct
            ))
        
        # Authority changes
        if prod.tax_authority_name != staging.tax_authority_name:
            changes.append(self._log_change(
                staging, 'authority_change', 'tax_authority_name',
                prod.tax_authority_name, staging.tax_authority_name,
                severity='warning'
            ))
        
        # Filing info changes
        filing_fields = [
            'filing_frequency', 'filing_day_of_month', 
            'online_filing_available', 'online_portal_url'
        ]
        
        for field in filing_fields:
            old_val = getattr(prod, field)
            new_val = getattr(staging, field)
            if old_val != new_val:
                changes.append(self._log_change(
                    staging, 'filing_change', field,
                    str(old_val), str(new_val),
                    severity='info'
                ))
        
        return changes
    
    def _get_rate_change_severity(self, change_pct: Decimal) -> str:
        """Determine severity based on rate change percentage"""
        change_pct = Decimal(str(change_pct))
        
        if change_pct >= self.RATE_CHANGE_THRESHOLDS['critical']:
            return 'critical'
        elif change_pct >= self.RATE_CHANGE_THRESHOLDS['major']:
            return 'warning'
        else:
            return 'info'
    
    def _log_change(self, staging, change_type, field_name, 
                    old_value, new_value, severity='info', 
                    change_percentage=None) -> Dict:
        """Log a change to the database"""
        
        change_log = TaxRateChangeLog.objects.create(
            country=staging.country,
            country_name=staging.country_name,
            region_name=staging.region_name,
            change_type=change_type,
            severity=severity,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            change_percentage=change_percentage,
            batch_id=self.batch_id,
            requires_approval=(severity in ['warning', 'critical'])
        )
        
        return {
            'id': change_log.id,
            'country': staging.country_name,
            'field': field_name,
            'old': old_value,
            'new': new_value,
            'severity': severity,
            'requires_approval': change_log.requires_approval
        }
    
    def create_validation_batch(self, user) -> TaxRateValidationBatch:
        """Create validation batch record"""
        batch = TaxRateValidationBatch.objects.create(
            batch_id=self.batch_id,
            created_by=user
        )
        batch.calculate_summary()
        return batch
    
    @db_transaction.atomic
    def apply_approved_changes(self, batch: TaxRateValidationBatch, user):
        """Apply approved changes to production"""
        if batch.status != 'approved':
            raise ValueError("Batch must be approved before applying")
        
        # Get all approved changes
        changes = TaxRateChangeLog.objects.filter(
            batch_id=batch.batch_id,
            approved=True
        )
        
        staging_records = GlobalSalesTaxRateStaging.objects.filter(
            batch_id=batch.batch_id,
            validation_status='passed'
        )
        
        applied_count = 0
        
        for staging in staging_records:
            try:
                # Update or create production record
                prod, created = GlobalSalesTaxRate.objects.update_or_create(
                    country=staging.country,
                    region_code=staging.region_code,
                    locality=staging.locality,
                    is_current=True,
                    defaults={
                        'country_name': staging.country_name,
                        'region_name': staging.region_name,
                        'tax_type': staging.tax_type,
                        'rate': staging.rate,
                        'tax_authority_name': staging.tax_authority_name,
                        'filing_frequency': staging.filing_frequency,
                        'filing_day_of_month': staging.filing_day_of_month,
                        'online_filing_available': staging.online_filing_available,
                        'online_portal_name': staging.online_portal_name,
                        'online_portal_url': staging.online_portal_url,
                        'main_form_name': staging.main_form_name,
                        'filing_instructions': staging.filing_instructions,
                        'manual_filing_fee': staging.manual_filing_fee,
                        'online_filing_fee': staging.online_filing_fee,
                        'filing_deadline_days': staging.filing_deadline_days,
                        'filing_deadline_description': staging.filing_deadline_description,
                        'grace_period_days': staging.grace_period_days,
                        'penalty_rate': staging.penalty_rate,
                        'deadline_notes': staging.deadline_notes,
                        'effective_date': staging.effective_date,
                    }
                )
                applied_count += 1
                
            except Exception as e:
                logger.error(f"Error applying change for {staging.country}: {e}")
                raise
        
        # Update batch status
        batch.status = 'applied'
        batch.applied_date = timezone.now()
        batch.save()
        
        logger.info(f"Applied {applied_count} changes from batch {batch.batch_id}")
        return applied_count
    
    @db_transaction.atomic
    def rollback_batch(self, batch: TaxRateValidationBatch):
        """Rollback a batch of changes"""
        if not batch.rollback_available:
            raise ValueError("Rollback not available for this batch")
        
        # Get all changes from this batch
        changes = TaxRateChangeLog.objects.filter(batch_id=batch.batch_id)
        
        # For each change, revert to old value
        for change in changes:
            if change.old_value is not None:
                try:
                    record = GlobalSalesTaxRate.objects.get(
                        country=change.country,
                        is_current=True
                    )
                    setattr(record, change.field_name, change.old_value)
                    record.save()
                except GlobalSalesTaxRate.DoesNotExist:
                    logger.warning(f"Cannot rollback - record not found: {change.country}")
        
        batch.rollback_available = False
        batch.save()
        
        logger.info(f"Rolled back batch {batch.batch_id}")