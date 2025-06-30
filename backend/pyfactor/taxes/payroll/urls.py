"""
URL patterns for Payroll Tax APIs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    Form941ViewSet, PayrollTaxDepositViewSet,
    PayrollTaxFilingScheduleViewSet, EmployerTaxAccountViewSet
)

app_name = 'payroll_tax'

router = DefaultRouter()
router.register(r'form-941', Form941ViewSet, basename='form941')
router.register(r'deposits', PayrollTaxDepositViewSet, basename='deposit')
router.register(r'filing-schedule', PayrollTaxFilingScheduleViewSet, basename='filing-schedule')
router.register(r'employer-account', EmployerTaxAccountViewSet, basename='employer-account')

urlpatterns = [
    path('', include(router.urls)),
]