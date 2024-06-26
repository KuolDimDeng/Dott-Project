# /Users/kuoldeng/projectx/backend/pyfactor/reports/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('generate/<str:report_type>/', views.generate_report, name='generate_report'),
    path('list/', views.list_reports, name='list_reports'),
]