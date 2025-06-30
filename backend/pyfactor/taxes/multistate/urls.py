"""
URL configuration for multi-state tax operations API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MultistateNexusProfileViewSet,
    StateNexusStatusViewSet,
    BusinessActivityViewSet,
    ApportionmentFactorsViewSet,
    MultistateReturnViewSet,
    NexusThresholdMonitoringViewSet,
    ReciprocityAgreementViewSet,
    ConsolidatedGroupViewSet
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'nexus-profiles', MultistateNexusProfileViewSet, basename='nexus-profiles')
router.register(r'nexus-status', StateNexusStatusViewSet, basename='nexus-status')
router.register(r'business-activities', BusinessActivityViewSet, basename='business-activities')
router.register(r'apportionment-factors', ApportionmentFactorsViewSet, basename='apportionment-factors')
router.register(r'multistate-returns', MultistateReturnViewSet, basename='multistate-returns')
router.register(r'threshold-monitoring', NexusThresholdMonitoringViewSet, basename='threshold-monitoring')
router.register(r'reciprocity-agreements', ReciprocityAgreementViewSet, basename='reciprocity-agreements')
router.register(r'consolidated-groups', ConsolidatedGroupViewSet, basename='consolidated-groups')

app_name = 'multistate'
urlpatterns = [
    path('', include(router.urls)),
]