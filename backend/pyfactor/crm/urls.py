from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
# Use single CustomerViewSet - no need for duplicate
router.register(r'customers', views.CustomerViewSet)
router.register(r'contacts', views.ContactViewSet)
router.register(r'leads', views.LeadViewSet)
router.register(r'opportunities', views.OpportunityViewSet)
router.register(r'deals', views.DealViewSet)
router.register(r'activities', views.ActivityViewSet)
router.register(r'campaigns', views.CampaignViewSet)
router.register(r'campaign-members', views.CampaignMemberViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # Dashboard endpoints
    path('dashboard/customers/', views.CustomerViewSet.as_view({'get': 'dashboard'}), name='customer-dashboard'),
    path('dashboard/leads/', views.LeadViewSet.as_view({'get': 'dashboard'}), name='lead-dashboard'),
    path('dashboard/opportunities/', views.OpportunityViewSet.as_view({'get': 'dashboard'}), name='opportunity-dashboard'),
    path('dashboard/deals/', views.DealViewSet.as_view({'get': 'dashboard'}), name='deal-dashboard'),
    path('dashboard/campaigns/', views.CampaignViewSet.as_view({'get': 'dashboard'}), name='campaign-dashboard'),
    
    # Activity specific endpoints
    path('activities/upcoming/', views.ActivityViewSet.as_view({'get': 'upcoming'}), name='upcoming-activities'),
    path('activities/overdue/', views.ActivityViewSet.as_view({'get': 'overdue'}), name='overdue-activities'),
    
    # Lead conversion
    path('leads/<str:pk>/convert/', views.LeadViewSet.as_view({'post': 'convert'}), name='lead-convert'),
]

app_name = 'crm'