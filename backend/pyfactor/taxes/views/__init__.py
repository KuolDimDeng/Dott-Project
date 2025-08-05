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
from .global_tax_rates import GlobalTaxRateViewSet
from .filing_service import (
    FilingServiceViewSet,
    get_country_requirements,
    get_sales_data,
    get_tax_info,
    get_countries_list
)
from .payroll_tax_views import (
    calculate_payroll_tax,
    get_payroll_tax_settings,
    create_payroll_tax_filing,
    get_payroll_tax_filing_history,
    get_payroll_tax_filing_status
)
from .location_data import (
    get_countries,
    get_states,
    get_counties,
    validate_location
)