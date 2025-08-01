"""
Comprehensive Timesheet Management URLs V2
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_v2 import (
    EmployeeTimesheetViewSet, TimeOffRequestViewSet, ClockEntryViewSet,
    SupervisorApprovalViewSet
)

# Create router for viewsets
router = DefaultRouter()
router.register('employee-timesheets', EmployeeTimesheetViewSet, basename='employee-timesheet')
router.register('time-off-requests', TimeOffRequestViewSet, basename='time-off-request')
router.register('clock-entries', ClockEntryViewSet, basename='clock-entry')
router.register('supervisor-approvals', SupervisorApprovalViewSet, basename='supervisor-approval')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Additional direct endpoints if needed
    path('health/', lambda request: JsonResponse({'status': 'ok'}), name='timesheets-health'),
]