from django.urls import path
from . import views

urlpatterns = [
    path('setup/woocommerce/', views.setup_woocommerce, name='setup_woocommerce'),
]