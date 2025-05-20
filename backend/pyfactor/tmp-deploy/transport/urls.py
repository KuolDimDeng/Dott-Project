from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'equipment', views.EquipmentViewSet)
router.register(r'drivers', views.DriverViewSet)
router.register(r'routes', views.RouteViewSet)
router.register(r'loads', views.LoadViewSet)
router.register(r'expenses', views.ExpenseViewSet)
router.register(r'maintenance', views.MaintenanceViewSet)
router.register(r'compliance', views.ComplianceViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # Dashboard endpoints
    path('dashboard/equipment/', views.EquipmentViewSet.as_view({'get': 'dashboard'}), name='equipment-dashboard'),
    path('dashboard/drivers/', views.DriverViewSet.as_view({'get': 'dashboard'}), name='driver-dashboard'),
    path('dashboard/routes/', views.RouteViewSet.as_view({'get': 'dashboard'}), name='route-dashboard'),
    path('dashboard/loads/', views.LoadViewSet.as_view({'get': 'dashboard'}), name='load-dashboard'),
    path('dashboard/expenses/', views.ExpenseViewSet.as_view({'get': 'dashboard'}), name='expense-dashboard'),
    path('dashboard/maintenance/', views.MaintenanceViewSet.as_view({'get': 'dashboard'}), name='maintenance-dashboard'),
    path('dashboard/compliance/', views.ComplianceViewSet.as_view({'get': 'dashboard'}), name='compliance-dashboard'),
    
    # Maintenance specific endpoints
    path('maintenance/upcoming/', views.MaintenanceViewSet.as_view({'get': 'upcoming'}), name='upcoming-maintenance'),
    
    # Compliance specific endpoints
    path('compliance/expiring/', views.ComplianceViewSet.as_view({'get': 'expiring'}), name='expiring-compliance'),
    path('compliance/expired/', views.ComplianceViewSet.as_view({'get': 'expired'}), name='expired-compliance'),
]

app_name = 'transport'