# Import all views from the original views module to maintain compatibility
from .views_orig import *
from .filing_locations import TaxFilingLocationViewSet
from .reminders import TaxReminderViewSet
from .filing_documents import FilingDocumentUploadView, TaxFilingViewSet
from .payment_views import (
    create_payment_session,
    get_filing_pricing,
    validate_payment_session,
    cancel_payment_session
)
from .confirmation_views import (
    FilingConfirmationViewSet,
    FilingNotificationViewSet
)