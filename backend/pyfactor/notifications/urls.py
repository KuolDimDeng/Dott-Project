"""
URL configuration for the notifications app
"""
from django.urls import path
from . import views
from . import admin_views
from . import admin_user_management
from . import admin_analytics
from . import admin_settings

app_name = 'notifications'

urlpatterns = [
    # User notification endpoints
    path('user/', views.UserNotificationListView.as_view(), name='user-notifications'),
    path('user/<uuid:notification_id>/mark-read/', views.MarkNotificationReadView.as_view(), name='mark-read'),
    path('user/mark-all-read/', views.MarkAllNotificationsReadView.as_view(), name='mark-all-read'),
    
    # Admin authentication endpoints (enhanced)
    path('admin/login/', admin_views.EnhancedAdminLoginView.as_view(), name='admin-login'),
    path('admin/mfa/verify/', admin_views.AdminMFAVerifyView.as_view(), name='admin-mfa-verify'),
    path('admin/mfa/setup/', admin_views.AdminMFASetupView.as_view(), name='admin-mfa-setup'),
    path('admin/refresh/', admin_views.AdminRefreshTokenView.as_view(), name='admin-refresh'),
    path('admin/logout/', admin_views.AdminLogoutView.as_view(), name='admin-logout'),
    path('admin/sessions/', admin_views.AdminSessionListView.as_view(), name='admin-sessions'),
    path('admin/sessions/<uuid:session_id>/', admin_views.AdminSessionListView.as_view(), name='admin-session-revoke'),
    
    # Admin operational endpoints (using enhanced permission)
    path('admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/feedback/', views.TaxFeedbackListView.as_view(), name='tax-feedback'),
    path('admin/feedback/<uuid:feedback_id>/', views.TaxFeedbackDetailView.as_view(), name='tax-feedback-detail'),
    path('admin/notifications/', views.AdminNotificationListView.as_view(), name='admin-notifications'),
    path('admin/notifications/create/', views.CreateNotificationView.as_view(), name='create-notification'),
    path('admin/notifications/<uuid:notification_id>/send/', views.SendNotificationView.as_view(), name='send-notification'),
    path('admin/templates/', views.NotificationTemplateListView.as_view(), name='notification-templates'),
    
    # Admin user management endpoints
    path('admin/users/', admin_user_management.AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/stats/', admin_user_management.AdminUserStatsView.as_view(), name='admin-user-stats'),
    path('admin/users/create/', admin_user_management.AdminUserCreateView.as_view(), name='admin-user-create'),
    path('admin/users/<uuid:user_id>/', admin_user_management.AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/users/<uuid:user_id>/block/', admin_user_management.AdminUserBlockView.as_view(), name='admin-user-block'),
    
    # Admin analytics and settings endpoints
    path('admin/analytics/', admin_analytics.AdminAnalyticsView.as_view(), name='admin-analytics'),
    path('admin/settings/', admin_settings.AdminSettingsView.as_view(), name='admin-settings'),
]