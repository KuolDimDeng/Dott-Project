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
from .views_validation import SessionValidateView
from .cloudflare_session_view import CloudflareSessionCreateView

app_name = 'sessions'

urlpatterns = [
    # Session management
    # Cloudflare-compatible session creation
    path('cloudflare/create/', CloudflareSessionCreateView.as_view(), name='cloudflare-session-create'),
    # Re-enabled session endpoints for Google OAuth flow
    path('create/', SessionCreateView.as_view(), name='session-create'),
    path('current/', SessionDetailView.as_view(), name='session-current'),
    # Session validation without authentication
    path('validate/<uuid:session_id>/', SessionValidateView.as_view(), name='session-validate'),
    path('validate/<uuid:session_id>', SessionValidateView.as_view(), name='session-validate-no-slash'),
    # Authenticated session detail (keeping for backward compatibility)
    path('<uuid:session_id>/', SessionDetailView.as_view(), name='session-detail'),
    path('<uuid:session_id>', SessionDetailView.as_view(), name='session-detail-no-slash'),
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