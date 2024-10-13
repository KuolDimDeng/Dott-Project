
#/Users/kuoldeng/projectx/backend/pyfactor/users/urls.py
from django.urls import path
from .views import (

    ProfileView,


)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('api/profile/', ProfileView.as_view(), name='profile'),
    path('api/user/', ProfileView.as_view(), name='user'),  # Endpoint for /api/user

]
