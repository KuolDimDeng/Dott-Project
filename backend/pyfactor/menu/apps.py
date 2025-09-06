"""
App configuration for Menu Management
"""
from django.apps import AppConfig


class MenuConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'menu'
    verbose_name = 'Menu Management'
    
    def ready(self):
        """Initialize app when Django starts"""
        pass