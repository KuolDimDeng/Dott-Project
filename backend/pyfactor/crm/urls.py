from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
# Import secure viewset for customers
try:
    from .views.secure_customer_viewset import SecureCustomerViewSet
    use_secure_customers = True
except ImportError:
    use_secure_customers = False

router = DefaultRouter()
# Use secure viewset for customers if available
if use_secure_customers:
    router.register(r'customers', SecureCustomerViewSet, basename='customer')
else:
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