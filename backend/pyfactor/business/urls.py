# Business SMS API URLs
from django.urls import path
from . import views

urlpatterns = [
    # SMS Contact API
    path('send-contact-sms', views.send_contact_sms, name='send_contact_sms'),
    
    # Business Conversion API
    path('convert-to-verified', views.convert_placeholder_to_verified, name='convert_to_verified'),
    
    # SMS Webhooks
    path('sms-delivery-callback', views.sms_delivery_callback, name='sms_delivery_callback'),
    path('sms-reply-callback', views.sms_reply_callback, name='sms_reply_callback'),
]