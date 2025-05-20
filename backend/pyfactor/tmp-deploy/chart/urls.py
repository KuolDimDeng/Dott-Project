# /Users/kuoldeng/projectx/backend/pyfactor/chart/urls.py
from django.urls import path
from .views import transaction_data

urlpatterns = [
    path('transaction-data/', transaction_data, name='transaction_data'),
]