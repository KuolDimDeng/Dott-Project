from django.apps import AppConfig

class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'  # replace with your actual app name

    def ready(self):
        import users.signals  # replace 'users' with your actual app name