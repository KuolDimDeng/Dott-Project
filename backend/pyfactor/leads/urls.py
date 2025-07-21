from django.urls import path
from . import views

urlpatterns = [
    # Public endpoint for creating leads
    path('create/', views.CreateLeadView.as_view(), name='create_lead'),
    
    # Admin endpoints for managing leads
    path('', views.LeadsListView.as_view(), name='leads_list'),
    path('<int:lead_id>/', views.LeadDetailView.as_view(), name='lead_detail'),
    path('stats/', views.get_lead_stats, name='lead_stats'),
]