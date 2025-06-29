from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SmartInsightsViewSet, StripeWebhookView

router = DefaultRouter()
router.register(r'smart-insights', SmartInsightsViewSet, basename='smart-insights')

urlpatterns = [
    path('', include(router.urls)),
    path('stripe/webhook/', StripeWebhookView.as_view({'post': 'webhook'}), name='stripe-webhook'),
]