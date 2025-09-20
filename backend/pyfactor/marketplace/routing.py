from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^ws/business/(?P<business_id>\w+)/$', consumers.BusinessNotificationConsumer.as_asgi()),
    re_path(r'^ws/consumer/(?P<consumer_id>\w+)/$', consumers.ConsumerNotificationConsumer.as_asgi()),
    re_path(r'^ws/courier/(?P<courier_id>\w+)/$', consumers.CourierNotificationConsumer.as_asgi()),
    re_path(r'^ws/orders/(?P<order_id>[\w-]+)/$', consumers.OrderTrackingConsumer.as_asgi()),
]