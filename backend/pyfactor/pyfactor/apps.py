from django.apps import AppConfig

class PyfactorConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pyfactor'

    def ready(self):
        # You can add any initialization code here if needed
        pass