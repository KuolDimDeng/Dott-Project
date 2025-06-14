"""
Session URL Configuration
"""

from django.urls import path
from .views import (
    SessionCreateView,
    SessionDetailView,
    SessionRefreshView,
    SessionListView,
    SessionInvalidateAllView
)

app_name = 'sessions'

urlpatterns = [
    # Session management
    path('create/', SessionCreateView.as_view(), name='session-create'),
    path('current/', SessionDetailView.as_view(), name='session-current'),
    path('refresh/', SessionRefreshView.as_view(), name='session-refresh'),
    path('', SessionListView.as_view(), name='session-list'),
    path('invalidate-all/', SessionInvalidateAllView.as_view(), name='session-invalidate-all'),
]