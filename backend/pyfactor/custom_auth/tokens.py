# /Users/kuoldeng/projectx/backend/pyfactor/users/tokens.py
from django.contrib.auth.tokens import PasswordResetTokenGenerator
import six  # Import six directly from the installed package

class AccountActivationTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        return (
            six.text_type(user.pk) + six.text_type(timestamp) + six.text_type(user.is_active)
        )

account_activation_token = AccountActivationTokenGenerator()
