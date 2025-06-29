from django.apps import AppConfig


class SmartInsightsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'smart_insights'
    verbose_name = 'Smart Insights'
    
    def ready(self):
        # Import signal handlers when the app is ready
        import smart_insights.signals