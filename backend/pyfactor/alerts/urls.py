from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlertViewSet, send_global_alert, user_alerts

router = DefaultRouter()
router.register(r'alerts', AlertViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('api/alerts/send_global_alert/', send_global_alert, name='send_global_alert'),
    path('api/alerts/user_alerts/', user_alerts, name='user_alerts'),

]