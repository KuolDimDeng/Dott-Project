# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/exceptions.py

class OnboardingError(Exception):
    """Base exception class for onboarding errors"""
    def __init__(self, message, code=None):
        super().__init__(message)
        self.code = code

class ValidationError(OnboardingError):
    """Raised when validation fails during onboarding"""
    def __init__(self, message, fields=None):
        super().__init__(message, code='validation_error')
        self.fields = fields or {}

class ServiceUnavailableError(OnboardingError):
    """Raised when required services are unavailable"""
    def __init__(self, message, service=None):
        super().__init__(message, code='service_unavailable')
        self.service = service

class DatabaseError(OnboardingError):
    """Raised when database operations fail"""
    def __init__(self, message, database_name=None):
        super().__init__(message, code='database_error')
        self.database_name = database_name

class SetupError(OnboardingError):
    """Raised when setup operations fail"""
    def __init__(self, message, step=None):
        super().__init__(message, code='setup_error')
        self.step = step