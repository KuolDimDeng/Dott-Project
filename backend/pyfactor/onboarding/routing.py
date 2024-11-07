# routing.py
from django.urls import re_path
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from onboarding.middleware import TokenAuthMiddlewareStack
from onboarding.consumers import OnboardingConsumer

websocket_urlpatterns = [
    re_path(r'ws/onboarding/(?P<user_id>[\w-]+)/$', OnboardingConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    'websocket': AllowedHostsOriginValidator(
        TokenAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})