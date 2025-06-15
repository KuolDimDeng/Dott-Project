from django.apps import AppConfig


class SessionManagerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'session_manager'
    verbose_name = 'Session Manager'
    
    def ready(self):
        """Initialize app when Django starts"""
        pass