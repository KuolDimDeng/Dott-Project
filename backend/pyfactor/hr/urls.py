from django.urls import path, include
from . import views
from .views import (
    PerformanceReviewViewSet, PerformanceMetricViewSet, PerformanceRatingViewSet,
    PerformanceGoalViewSet, FeedbackRecordViewSet, PerformanceSettingViewSet,
    TimesheetViewSet, TimesheetEntryViewSet, TimesheetSettingViewSet, TimeOffRequestViewSet,
    TimeOffBalanceViewSet, BenefitsViewSet, LocationLogViewSet, EmployeeLocationConsentViewSet,
    LocationCheckInViewSet, clock_in_with_location, clock_out_with_location
)
from rest_framework.routers import DefaultRouter

# Add router for viewsets
router = DefaultRouter()
router.register(r'performance/reviews', PerformanceReviewViewSet)
router.register(r'performance/metrics', PerformanceMetricViewSet)
router.register(r'performance/ratings', PerformanceRatingViewSet)
router.register(r'performance/goals', PerformanceGoalViewSet)
router.register(r'performance/feedback', FeedbackRecordViewSet)
router.register(r'performance/settings', PerformanceSettingViewSet)
router.register(r'timesheets', TimesheetViewSet)
router.register(r'timesheet-entries', TimesheetEntryViewSet)
router.register(r'timesheet-settings', TimesheetSettingViewSet)
router.register(r'time-off-requests', TimeOffRequestViewSet)
router.register(r'time-off-balances', TimeOffBalanceViewSet)
router.register(r'benefits', BenefitsViewSet)
router.register(r'location-logs', LocationLogViewSet)
router.register(r'location-consents', EmployeeLocationConsentViewSet)
router.register(r'location-checkins', LocationCheckInViewSet)

urlpatterns = [
    # API endpoints
    path('api/', include('hr.api.urls')),
    
    # V2 API endpoints (new clean implementation)
    path('v2/', include('hr.urls_v2')),
    
    # Employee URLs (old - to be deprecated)
    path('employees/', views.employee_list, name='employee-list'),
    path('employees/stats/', views.employee_stats, name='employee-stats'),
    path('employees/basic/', views.employee_basic_list, name='employee-basic-list'),
    path('employees/<uuid:pk>/', views.employee_detail, name='employee-detail'),
    path('employees/<uuid:pk>/permissions/', views.set_employee_permissions, name='set-employee-permissions'),
    path('permissions/available/', views.get_available_permissions, name='get-available-permissions'),
    path('setup-password/', views.setup_employee_password, name='setup-employee-password'),
    
    # Role URLs
    path('roles/', views.role_list, name='role-list'),
    path('roles/<int:pk>/', views.role_detail, name='role-detail'),
    
    # Employee Role URLs
    path('employee-roles/', views.employee_role_list, name='employee-role-list'),
    path('employee-roles/<int:pk>/', views.employee_role_detail, name='employee-role-detail'),
    
    # Access Permission URLs
    path('access-permissions/', views.access_permission_list, name='access-permission-list'),
    path('access-permissions/<int:pk>/', views.access_permission_detail, name='access-permission-detail'),
    
    # Preboarding Form URLs
    path('preboarding-forms/', views.preboarding_form_list, name='preboarding-form-list'),
    path('preboarding-forms/<int:pk>/', views.preboarding_form_detail, name='preboarding-form-detail'),
    
    # Health check endpoint (public)
    path('health/', views.health_check, name='hr-health-check'),
    
    # Location tracking endpoints
    path('clock-in-location/', clock_in_with_location, name='clock-in-location'),
    path('clock-out-location/', clock_out_with_location, name='clock-out-location'),
    
    # Include router URLs
    path('', include(router.urls)),
]