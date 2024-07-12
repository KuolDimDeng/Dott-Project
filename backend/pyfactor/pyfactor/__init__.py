# /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/__init__.py

default_app_config = 'pyfactor.apps.PyfactorConfig'

# This ensures the celery app is loaded when Django starts
from .celery import app as celery_app

__all__ = ('celery_app',)