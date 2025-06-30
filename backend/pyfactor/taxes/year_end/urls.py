from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    W2FormViewSet,
    Form1099ViewSet,
    YearEndTaxGenerationViewSet
)

router = DefaultRouter()
router.register(r'w2-forms', W2FormViewSet, basename='w2-forms')
router.register(r'1099-forms', Form1099ViewSet, basename='1099-forms')
router.register(r'generation', YearEndTaxGenerationViewSet, basename='year-end-generation')

urlpatterns = [
    path('', include(router.urls)),
]