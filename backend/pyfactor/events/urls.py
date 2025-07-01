from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'events', views.EventViewSet, basename='event')

urlpatterns = [
    path('', include(router.urls)),
    
    # Additional endpoints
    path('events/upcoming/', views.EventViewSet.as_view({'get': 'upcoming'}), name='event-upcoming'),
    path('events/today/', views.EventViewSet.as_view({'get': 'today'}), name='event-today'),
]

app_name = 'events'