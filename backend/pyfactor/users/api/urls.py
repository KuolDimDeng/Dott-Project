"""
Users API URL Configuration
"""
from django.urls import path
from .user_profile_views import UserProfileMeView

urlpatterns = [
    path('me/', UserProfileMeView.as_view(), name='user-profile-me'),
]