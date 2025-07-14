from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TimesheetViewSet, TimeEntryViewSet, ClockEntryViewSet,
    TimeOffRequestViewSet, GeofenceZoneViewSet
)

router = DefaultRouter()
router.register(r'timesheets', TimesheetViewSet, basename='timesheet')
router.register(r'time-entries', TimeEntryViewSet, basename='timeentry')
router.register(r'clock-entries', ClockEntryViewSet, basename='clockentry')
router.register(r'time-off-requests', TimeOffRequestViewSet, basename='timeoffrequest')
router.register(r'geofence-zones', GeofenceZoneViewSet, basename='geofencezone')

urlpatterns = [
    path('', include(router.urls)),
]