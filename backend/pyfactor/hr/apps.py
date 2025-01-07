#/Users/kuoldeng/projectx/backend/pyfactor/hr/apps.py

from django.apps import AppConfig

class HrConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'hr'
    verbose_name = 'HR Management'  # Add this for better admin display
    
    def ready(self):
        """
        Initialize any app-specific settings or signals
        """
        try:
            import hr.signals  # Import any signals if you have them
        except ImportError:
            pass