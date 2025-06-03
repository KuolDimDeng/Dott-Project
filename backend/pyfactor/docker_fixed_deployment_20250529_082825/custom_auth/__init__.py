"""
Custom authentication package for handling Cognito integration and user attributes.
"""

from .client import get_cognito_client

__all__ = ['get_cognito_client']
