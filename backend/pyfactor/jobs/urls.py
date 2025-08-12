from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create the main router
router = DefaultRouter()
router.register(r'jobs', views.JobViewSet, basename='job')
router.register(r'vehicles', views.VehicleViewSet, basename='vehicle')
router.register(r'data', views.JobDataViewSet, basename='job-data')

# For now, we'll use regular URL patterns for nested resources
urlpatterns = [
    path('', include(router.urls)),
    # Nested job resources
    path('<int:job_pk>/materials/', views.JobMaterialViewSet.as_view({'get': 'list', 'post': 'create'}), name='job-materials-list'),
    path('<int:job_pk>/materials/<int:pk>/', views.JobMaterialViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='job-materials-detail'),
    path('<int:job_pk>/labor/', views.JobLaborViewSet.as_view({'get': 'list', 'post': 'create'}), name='job-labor-list'),
    path('<int:job_pk>/labor/<int:pk>/', views.JobLaborViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='job-labor-detail'),
    path('<int:job_pk>/expenses/', views.JobExpenseViewSet.as_view({'get': 'list', 'post': 'create'}), name='job-expenses-list'),
    path('<int:job_pk>/expenses/<int:pk>/', views.JobExpenseViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='job-expenses-detail'),
    # Job documents
    path('<int:job_pk>/documents/', views.JobDocumentViewSet.as_view({'get': 'list', 'post': 'create'}), name='job-documents-list'),
    path('<int:job_pk>/documents/<int:pk>/', views.JobDocumentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='job-documents-detail'),
    path('<int:job_pk>/documents/upload-receipt/', views.JobDocumentViewSet.as_view({'post': 'upload_receipt'}), name='job-upload-receipt'),
    # Status history (read-only)
    path('<int:job_pk>/status-history/', views.JobStatusHistoryViewSet.as_view({'get': 'list'}), name='job-status-history-list'),
    path('<int:job_pk>/status-history/<int:pk>/', views.JobStatusHistoryViewSet.as_view({'get': 'retrieve'}), name='job-status-history-detail'),
    # Communications
    path('<int:job_pk>/communications/', views.JobCommunicationViewSet.as_view({'get': 'list', 'post': 'create'}), name='job-communications-list'),
    path('<int:job_pk>/communications/<int:pk>/', views.JobCommunicationViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='job-communications-detail'),
]