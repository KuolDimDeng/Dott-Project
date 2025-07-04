"""
URL configuration for notification system
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

urlpatterns = [
    # Admin authentication
    path('admin/login/', views.AdminLoginView.as_view(), name='admin-login'),
    
    # Admin dashboard
    path('admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    
    # Tax feedback management
    path('admin/feedback/', views.TaxFeedbackManagementView.as_view(), name='admin-feedback'),
    path('admin/feedback/<uuid:feedback_id>/', views.TaxFeedbackManagementView.as_view(), name='admin-feedback-detail'),
    
    # Notification management
    path('admin/notifications/', views.NotificationManagementView.as_view(), name='admin-notifications'),
    path('admin/notifications/<uuid:notification_id>/send/', views.send_notification, name='send-notification'),
    
    # Templates
    path('admin/templates/', views.get_notification_templates, name='notification-templates'),
    
    # User notification endpoints
    path('user/', views.UserNotificationView.as_view(), name='user-notifications'),
    path('user/<uuid:notification_id>/mark-read/', views.mark_notification_read, name='mark-notification-read'),
    path('user/mark-all-read/', views.mark_all_notifications_read, name='mark-all-notifications-read'),
]