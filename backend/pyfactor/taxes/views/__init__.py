# Import all views from the original views module to maintain compatibility
from .views_orig import *
from .filing_locations import TaxFilingLocationViewSet
from .reminders import TaxReminderViewSet