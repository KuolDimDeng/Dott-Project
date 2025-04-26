from django.urls import path
from . import views

urlpatterns = [
    # Employee URLs
    path('employees/', views.employee_list, name='employee-list'),
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
]