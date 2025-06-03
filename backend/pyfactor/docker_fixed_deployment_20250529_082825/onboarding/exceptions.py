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

class SchemaError(OnboardingError):
    """Raised when schema operations fail"""
    def __init__(tenant_id: uuid.UUID:
        super().__init__(message, code='schema_error')
        self.schema_name = schema_name

class SetupError(OnboardingError):
    """Raised when setup operations fail"""
    def __init__(self, message, step=None):
        super().__init__(message, code='setup_error')
        self.step = step