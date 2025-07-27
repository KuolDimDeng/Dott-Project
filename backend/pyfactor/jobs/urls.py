from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create the main router
router = DefaultRouter()
router.register(r'jobs', views.JobViewSet, basename='job')
router.register(r'vehicles', views.VehicleViewSet, basename='vehicle')

# For now, we'll use regular URL patterns for nested resources
urlpatterns = [
    path('api/', include(router.urls)),
    # Nested job resources
    path('api/jobs/<int:job_pk>/materials/', views.JobMaterialViewSet.as_view({'get': 'list', 'post': 'create'}), name='job-materials-list'),
    path('api/jobs/<int:job_pk>/materials/<int:pk>/', views.JobMaterialViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='job-materials-detail'),
    path('api/jobs/<int:job_pk>/labor/', views.JobLaborViewSet.as_view({'get': 'list', 'post': 'create'}), name='job-labor-list'),
    path('api/jobs/<int:job_pk>/labor/<int:pk>/', views.JobLaborViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='job-labor-detail'),
    path('api/jobs/<int:job_pk>/expenses/', views.JobExpenseViewSet.as_view({'get': 'list', 'post': 'create'}), name='job-expenses-list'),
    path('api/jobs/<int:job_pk>/expenses/<int:pk>/', views.JobExpenseViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='job-expenses-detail'),
]