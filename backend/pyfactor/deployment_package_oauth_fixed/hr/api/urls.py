from django.urls import path
from .views import (
    CurrentEmployeeView, BenefitsListCreateView, EmployeeBenefitsDetailView
)

urlpatterns = [
    # Employee views
    path('current-employee/', CurrentEmployeeView.as_view(), name='current-employee'),
    
    # Benefits views
    path('benefits/', BenefitsListCreateView.as_view(), name='benefits-list'),
    path('employees/<str:employee_id>/benefits/', EmployeeBenefitsDetailView.as_view(), name='employee-benefits-detail'),
] 