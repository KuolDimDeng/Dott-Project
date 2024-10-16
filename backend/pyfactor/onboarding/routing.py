from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/onboarding/(?P<user_id>[^/]+)/$', consumers.OnboardingConsumer.as_asgi()),
]