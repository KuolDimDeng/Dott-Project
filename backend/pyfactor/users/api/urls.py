"""
Users API URL Configuration
"""
from django.urls import path
from .user_profile_views import UserProfileMeView
from .business_features_views import BusinessFeaturesView

# Import these views only if the files exist
try:
    from .profile_views import ProfilePhotoUploadView, UserProfileView
    from .session_views import UserSessionListView, UserSessionDetailView, UserLoginHistoryView
    HAS_NEW_VIEWS = True
except ImportError:
    HAS_NEW_VIEWS = False

urlpatterns = [
    path('me/', UserProfileMeView.as_view(), name='user-profile-me'),
    path('business-features/', BusinessFeaturesView.as_view(), name='business-features'),
]

# Only add new endpoints if the views are available
if HAS_NEW_VIEWS:
    urlpatterns += [
        # Profile endpoints
        path('profile/', UserProfileView.as_view(), name='user-profile-enhanced'),
        path('upload-photo/', ProfilePhotoUploadView.as_view(), name='user-upload-photo'),
        
        # Session management endpoints
        path('sessions/', UserSessionListView.as_view(), name='user-sessions'),
        path('sessions/<uuid:session_id>/', UserSessionDetailView.as_view(), name='user-session-detail'),
        path('login-history/', UserLoginHistoryView.as_view(), name='user-login-history'),
    ]