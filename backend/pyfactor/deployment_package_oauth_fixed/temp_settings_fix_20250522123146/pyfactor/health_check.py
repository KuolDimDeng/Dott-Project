"""
Simple health check utilities for Django application.
"""
from django.http import JsonResponse
import logging

logger = logging.getLogger(__name__)

def health_check(request):
    """Simple health check endpoint for AWS ELB"""
    return JsonResponse({
        "status": "healthy",
        "service": "pyfactor",
        "version": "1.0.0"
    })

def simple_health_check():
    """Function version of health check for standalone use"""
    return {"status": "healthy", "service": "pyfactor"}
