from django.db import models
from django.conf import settings
from cryptography.fernet import Fernet
import base64

# Use Django's SECRET_KEY to create a Fernet instance
fernet = Fernet(base64.urlsafe_b64encode(settings.SECRET_KEY.encode()[:32]))

class EncryptedCharField(models.CharField):
    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        return fernet.decrypt(value.encode()).decode()

    def to_python(self, value):
        if isinstance(value, str):
            return value
        if value is None:
            return value
        return fernet.decrypt(value.encode()).decode()

    def get_prep_value(self, value):
        if value is None:
            return value
        return fernet.encrypt(value.encode()).decode()