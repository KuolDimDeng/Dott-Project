# Import all tax models from subdirectory
from .tax_accounting import (
    TaxAccount,
    TaxTransaction,
    TaxPeriodSummary,
    TaxAccountingFiling,
    TaxAccountingSettings
)
from .tax_validation import *
from .tenant_tax_settings import *

# For backward compatibility, make sure models that other apps expect are available
# These come from the parent models.py file
try:
    # Import specific models that are referenced elsewhere
    from ..models import (
        State, 
        IncomeTaxRate, 
        PayrollTaxFiling, 
        TaxFilingInstruction, 
        TaxForm,
        TaxDataEntryControl, 
        TaxDataEntryLog, 
        TaxDataAbuseReport, 
        TaxDataBlacklist,
        TaxSettings,  # Original TaxSettings from parent
        TaxApiUsage,
        TaxFilingLocation,
        TaxReminder,
        TaxFiling,  # This is what webhook_handlers needs
        FilingDocument,
        FilingConfirmation,
        FilingNotification,
        NotificationType,
        NotificationStatus,
        GlobalSalesTaxRate,
        GlobalPayrollTax,
        SalesTaxJurisdictionOverride
    )
except ImportError as e:
    # If imports fail, it means we're in migration or the parent models.py doesn't exist yet
    import logging
    logging.warning(f"Could not import from parent models.py: {e}")

__all__ = [
    'TaxAccount',
    'TaxTransaction', 
    'TaxPeriodSummary',
    'TaxAccountingFiling',
    'TaxAccountingSettings',
    # Also export the ones from parent models.py
    'TaxFiling',
    'State',
    'GlobalSalesTaxRate',
    'GlobalPayrollTax',
]