from django.urls import path
from .views import (
    CurrentEmployeeView, BenefitsListCreateView, EmployeeBenefitsDetailView
)
from .employee_profile_views import (
    EmployeeProfileView, EmployeeBankInfoView, EmployeeTaxInfoView,
    employee_profile_debug
)

urlpatterns = [
    # Employee views
    path('current-employee/', CurrentEmployeeView.as_view(), name='current-employee'),
    
    # Employee profile views
    path('employee/profile/', EmployeeProfileView.as_view(), name='employee-profile'),
    path('employee/bank-info/', EmployeeBankInfoView.as_view(), name='employee-bank-info'),
    path('employee/tax-info/', EmployeeTaxInfoView.as_view(), name='employee-tax-info'),
    path('employee/profile/debug/', employee_profile_debug, name='employee-profile-debug'),
    
    # Benefits views
    path('benefits/', BenefitsListCreateView.as_view(), name='benefits-list'),
    path('employees/<str:employee_id>/benefits/', EmployeeBenefitsDetailView.as_view(), name='employee-benefits-detail'),
] 