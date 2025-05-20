# integrations/apps.py

from django.apps import AppConfig
from django.contrib.auth import get_user_model
from django.conf import settings

class IntegrationsConfig(AppConfig):
    name = 'integrations'

    def ready(self):
      #  User = get_user_model()

        # Ensure you have a default user created in your database.
       # default_user, created = User.objects.get_or_create(
        #    email='default@example.com',  # Use email instead of username
         #   defaults={
          #      'first_name': 'Default',
           #     'last_name': 'User',
            #    'password': User.objects.make_random_password()
            #}
       # )

        #settings.DEFAULT_USER_ID = default_user.id
        pass