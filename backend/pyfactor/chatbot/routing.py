from django.urls import re_path
from . import consumers
from pyfactor.logging_config import get_logger

logger = get_logger()

logger.debug("Configuring websocket_urlpatterns")
websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<username>\w+)/$', consumers.ChatConsumer.as_asgi()),
]
logger.debug("websocket_urlpatterns configured")