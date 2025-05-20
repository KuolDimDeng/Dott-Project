#/Users/kuoldeng/projectx/backend/pyfactor/users/exceptions.py
class UserError(Exception):
    """Base exception class for user-related errors"""
    def __init__(self, message, code=None):
        super().__init__(message)
        self.code = code

class DatabaseError(UserError):
    """Raised when database operations fail"""
    def __init__(self, message, database_name=None):
        super().__init__(message, code='database_error')
        self.database_name = database_name

class ValidationError(UserError):
    """Raised when validation fails"""
    def __init__(self, message, fields=None):
        super().__init__(message, code='validation_error')
        self.fields = fields or {}

class ServiceUnavailableError(UserError):
    """Raised when required services are unavailable"""
    def __init__(self, message, service=None):
        super().__init__(message, code='service_unavailable')
        self.service = service