from django.urls import path
from . import views

urlpatterns = [
    path('generate/<str:report_type>/', views.generate_report, name='generate_report'),
]