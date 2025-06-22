"""
Session URL Configuration
"""

from django.urls import path, include
from .views import (
    SessionDetailView,
    SessionRefreshView,
    SessionListView,
    SessionInvalidateAllView
)
from .views_fixed import SessionCreateViewFixed as SessionCreateView
from .security_views import get_active_sessions

app_name = 'sessions'

urlpatterns = [
    # Session management
    # REMOVED - Use /api/auth/session-v2
    # path('create/', SessionCreateView.as_view(), name='session-create'),
    # REMOVED - Use /api/auth/session-v2
    # path('current/', SessionDetailView.as_view(), name='session-current'),
    # REMOVED - Use /api/auth/session-v2
    # path('refresh/', SessionRefreshView.as_view(), name='session-refresh'),
    # REMOVED - Use /api/auth/session-v2
    # path('', SessionListView.as_view(), name='session-list'),
    # REMOVED - Use /api/auth/session-v2
    # path('active/', get_active_sessions, name='session-active'),
    path('invalidate-all/', SessionInvalidateAllView.as_view(), name='session-invalidate-all'),
    
    # Security endpoints
    path('security/', include('session_manager.security_urls')),
]