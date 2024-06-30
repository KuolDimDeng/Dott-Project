from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FinancialDataViewSet, ChartConfigurationViewSet

router = DefaultRouter()
router.register(r'financial-data', FinancialDataViewSet)
router.register(r'chart-configurations', ChartConfigurationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]