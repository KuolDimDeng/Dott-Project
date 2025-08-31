"""
Moderation URL Configuration
"""
from django.urls import path
from . import views

app_name = 'moderation'

urlpatterns = [
    path('report/', views.report_chat_message, name='report_message'),
    path('block/', views.block_user, name='block_user'),
    path('stats/', views.get_moderation_stats, name='moderation_stats'),
]