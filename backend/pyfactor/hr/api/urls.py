from django.urls import path
from .views import (
    CurrentEmployeeView, BenefitsListCreateView, EmployeeBenefitsDetailView
)
from .employee_profile_views import (
    EmployeeProfileView, EmployeeBankInfoView, EmployeeTaxInfoView,
    employee_profile_debug
)
from .test_minimal_view import MinimalTestView
from .test_debug_view import DebugTestView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET'])
def test_routing(request):
    """Simple test endpoint to verify routing"""
    return Response({"test": "HR API routing works", "path": request.path})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_profile_simple(request):
    """Super simple profile test with auth"""
    return Response({
        "test": "Profile endpoint works", 
        "user_id": str(request.user.id),
        "user_email": request.user.email,
        "authenticated": request.user.is_authenticated
    })

urlpatterns = [
    # Test endpoint (no auth required)
    path('test/', test_routing, name='test-routing'),
    path('test-profile-simple/', test_profile_simple, name='test-profile-simple'),
    path('test-minimal/', MinimalTestView.as_view(), name='test-minimal'),
    path('test-debug/', DebugTestView.as_view(), name='test-debug'),
    
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