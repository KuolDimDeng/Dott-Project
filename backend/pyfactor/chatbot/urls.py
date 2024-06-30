# chatbot/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('messages/get_messages/', views.get_messages, name='get_messages'),
    path('messages/send_message/', views.send_message, name='send_message'),
]