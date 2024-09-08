from django.urls import path
from . import views

urlpatterns = [
    # Employee URLs
    path('employees/create/', views.create_employee, name='create-employee'),
    path('employees/<uuid:pk>/', views.employee_detail, name='employee-detail'),
    path('employees/', views.employee_list, name='employee-list'),
    path('employees/<uuid:pk>/update/', views.update_employee, name='update-employee'),
    path('employees/<uuid:pk>/delete/', views.delete_employee, name='delete-employee'),

    # Role URLs
    path('roles/', views.role_list, name='role-list'),
    path('roles/<int:pk>/', views.role_detail, name='role-detail'),

    # EmployeeRole URLs
    path('employee-roles/', views.employee_role_list, name='employee-role-list'),
    path('employee-roles/<int:pk>/', views.employee_role_detail, name='employee-role-detail'),

    # AccessPermission URLs
    path('access-permissions/', views.access_permission_list, name='access-permission-list'),
    path('access-permissions/<int:pk>/', views.access_permission_detail, name='access-permission-detail'),


]