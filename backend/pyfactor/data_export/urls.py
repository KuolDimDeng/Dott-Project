from django.urls import path
from .views import DataExportView

app_name = 'data_export'

urlpatterns = [
    path('export/', DataExportView.as_view(), name='export_data'),
]