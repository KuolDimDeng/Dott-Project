from django.urls import path
from . import views

app_name = 'invitations'

urlpatterns = [
    path('whatsapp/', views.send_whatsapp_invitation, name='send-whatsapp'),
    path('email/', views.send_email_invitation, name='send-email'),
]