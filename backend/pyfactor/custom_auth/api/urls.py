from django.urls import path
from .views.auth_views import VerifyCredentialsView

urlpatterns = [
    path('verify/', VerifyCredentialsView.as_view(), name='verify-credentials'),
]
