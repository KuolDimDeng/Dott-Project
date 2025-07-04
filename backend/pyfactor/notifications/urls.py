"""
URL configuration for the notifications app
"""
from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    # User notification endpoints
    path('user/', views.UserNotificationListView.as_view(), name='user-notifications'),
    path('user/<uuid:notification_id>/mark-read/', views.MarkNotificationReadView.as_view(), name='mark-read'),
    path('user/mark-all-read/', views.MarkAllNotificationsReadView.as_view(), name='mark-all-read'),
    
    # Admin endpoints
    path('admin/login/', views.AdminLoginView.as_view(), name='admin-login'),
    path('admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/feedback/', views.TaxFeedbackListView.as_view(), name='tax-feedback'),
    path('admin/feedback/<uuid:feedback_id>/', views.TaxFeedbackDetailView.as_view(), name='tax-feedback-detail'),
    path('admin/notifications/', views.AdminNotificationListView.as_view(), name='admin-notifications'),
    path('admin/notifications/create/', views.CreateNotificationView.as_view(), name='create-notification'),
    path('admin/notifications/<uuid:notification_id>/send/', views.SendNotificationView.as_view(), name='send-notification'),
    path('admin/templates/', views.NotificationTemplateListView.as_view(), name='notification-templates'),
]