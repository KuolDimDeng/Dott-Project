from django.urls import path
from . import views

urlpatterns = [
    path('update/', views.update_tax_info, name='update_tax_info'),
    path('federal/', views.get_federal_taxes, name='get_federal_taxes'),
    path('state/<str:state>/', views.get_state_taxes, name='get_state_taxes'),
    path('economic/<str:series_id>/', views.get_economic_data, name='get_economic_data'),
]