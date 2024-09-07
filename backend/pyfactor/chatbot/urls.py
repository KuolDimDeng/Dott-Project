# chatbot/urls.py
from django.urls import path
from . import views
from pyfactor.logging_config import get_logger

logger = get_logger()
logger.debug("Attempting to import from chatbot.views")
from chatbot.views import staff_interface, respond_to_message, get_messages, send_message, message_details
logger.debug("Successfully imported from chatbot.views")

urlpatterns = [
    path('get_messages/', get_messages, name='get_messages'),
    path('send_message/', send_message, name='send_message'),
    path('staff/', staff_interface, name='staff_interface'),
    path('staff/respond/<int:message_id>/', respond_to_message, name='respond_to_message'),
    path('message_details/<int:message_id>/', message_details, name='message_details'),
    path('user_details/<int:message_id>/', views.user_details, name='user_details'),
]