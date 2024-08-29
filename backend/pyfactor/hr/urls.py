# hr/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # Employee URLs
    path('api/employees/create/', views.create_employee, name='create-employee'),
    path('api/employees/<uuid:pk>/', views.employee_detail, name='employee-detail'),
    path('api/employees/', views.employee_list, name='employee-list'),
    path('api/employees/<uuid:pk>/update/', views.update_employee, name='update-employee'),
    path('api/employees/<uuid:pk>/delete/', views.delete_employee, name='delete-employee'),

    # Role URLs
    path('api/roles/', views.role_list, name='role-list'),
    path('api/roles/<int:pk>/', views.role_detail, name='role-detail'),

    # EmployeeRole URLs
    path('api/employee-roles/', views.employee_role_list, name='employee-role-list'),
    path('api/employee-roles/<int:pk>/', views.employee_role_detail, name='employee-role-detail'),

    # AccessPermission URLs
    path('api/access-permissions/', views.access_permission_list, name='access-permission-list'),
    path('api/access-permissions/<int:pk>/', views.access_permission_detail, name='access-permission-detail'),
]