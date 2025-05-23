"""
Django app configuration for pyfactor.
"""
from django.apps import AppConfig


class PyfactorConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pyfactor'
    verbose_name = 'Pyfactor Application'
    
    def ready(self):
        """
        Called when Django starts up.
        """
        pass
