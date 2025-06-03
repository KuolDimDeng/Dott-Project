"""
Module for instantiating the Cognito client.
This is separated from __init__.py to avoid circular imports during Django startup.
"""

from django.apps import apps

def get_cognito_client():
    """
    Get the CognitoClient instance.
    This is wrapped in a function to ensure Django apps are loaded before importing.
    """
    if not apps.ready:
        raise RuntimeError(
            "Cognito client accessed before Django apps are ready. "
            "Ensure you're importing get_cognito_client after django.setup() is called."
        )
    
    from .cognito import CognitoClient
    return CognitoClient()

# The client instance - only access this after Django apps are ready
cognito_client = None
