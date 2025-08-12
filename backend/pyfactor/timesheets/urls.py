from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TimesheetViewSet, TimeEntryViewSet, ClockEntryViewSet,
    TimeOffRequestViewSet, GeofenceZoneViewSet
)
from .views_v2 import (
    EmployeeTimesheetViewSet, TimeOffRequestViewSet as TimeOffRequestV2ViewSet, 
    ClockEntryViewSet as ClockEntryV2ViewSet, SupervisorApprovalViewSet
)

# Original router (legacy)
router = DefaultRouter()
router.register(r'timesheets', TimesheetViewSet, basename='timesheet')
router.register(r'time-entries', TimeEntryViewSet, basename='timeentry')
router.register(r'clock-entries', ClockEntryViewSet, basename='clockentry')
router.register(r'time-off-requests', TimeOffRequestViewSet, basename='timeoffrequest')
router.register(r'geofence-zones', GeofenceZoneViewSet, basename='geofencezone')

# V2 router (comprehensive system)
router_v2 = DefaultRouter()
router_v2.register(r'employee-timesheets', EmployeeTimesheetViewSet, basename='employee-timesheet-v2')
router_v2.register(r'time-off-requests', TimeOffRequestV2ViewSet, basename='time-off-request-v2')
router_v2.register(r'clock-entries', ClockEntryV2ViewSet, basename='clock-entry-v2')
router_v2.register(r'supervisor-approvals', SupervisorApprovalViewSet, basename='supervisor-approval-v2')

urlpatterns = [
    # Legacy endpoints
    path('', include(router.urls)),
    
    # V2 comprehensive endpoints
    path('v2/', include(router_v2.urls)),
]