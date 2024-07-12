
#/Users/kuoldeng/projectx/backend/pyfactor/integrations/urls.py
from django.urls import path
from django.views.generic import TemplateView
from . import views

urlpatterns = [
    path('setup/woocommerce/', views.setup_woocommerce, name='setup_woocommerce'),
    path('connect-woocommerce/', views.connect_woocommerce, name='connect_woocommerce'),
    path('connect-shopify/', views.connect_shopify, name='connect_shopify'),
    path('initiate-shopify-oauth/', views.initiate_shopify_oauth, name='initiate-shopify-oauth'),
    path('shopify-oauth-callback/', views.shopify_oauth_callback, name='shopify-oauth-callback'),
    path('dashboard/integrations/', TemplateView.as_view(template_name='dashboard/integrations.html'), name='dashboard_integrations'),

]