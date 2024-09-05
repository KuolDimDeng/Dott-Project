# chatbot/urls.py
from django.urls import path
from . import views
from pyfactor.logging_config import get_logger

logger = get_logger()

logger.debug("Attempting to import from chatbot.views")
from chatbot.views import staff_interface, respond_to_message, get_messages, send_message
logger.debug("Successfully imported from chatbot.views")

urlpatterns = [
    path('api/chatbot/messages/get_messages/', get_messages, name='get_messages'),
    path('api/chatbot/messages/send_message/', send_message, name='send_message'),
    path('staff/', views.staff_interface, name='staff_interface'),
    path('staff/respond/<int:message_id>/', views.respond_to_message, name='respond_to_message'),
]