"""
CRITICAL SECURITY FIX: Tenant isolation for CRM views
This fixes the RLS breach where new users could see all tenant data
"""
from custom_auth.tenant_base_viewset import TenantIsolatedViewSet
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Sum
import logging

from .models import Customer, Contact, Lead, Opportunity, Deal, Activity, Campaign, CampaignMember
from .serializers import (
    CustomerSerializer, CustomerDetailSerializer, ContactSerializer,
    LeadSerializer, LeadDetailSerializer, OpportunitySerializer,
    DealSerializer, ActivitySerializer, CampaignSerializer
)

logger = logging.getLogger(__name__)


class TenantFilteredViewSet(TenantIsolatedViewSet):
    """Base ViewSet that ALWAYS filters by tenant"""
    
    def get_queryset(self):
        """Override to ensure tenant filtering"""
        queryset = super().get_queryset()
        
        # Get tenant_id from user
        if not hasattr(self.request.user, 'tenant_id'):
            logger.error(f"User {self.request.user} has no tenant_id!")
            return queryset.none()
        
        tenant_id = self.request.user.tenant_id
        if not tenant_id:
            # Also check business_id as fallback
            tenant_id = getattr(self.request.user, 'business_id', None)
        
        if not tenant_id:
            logger.error(f"No tenant_id found for user {self.request.user}")
            return queryset.none()
        
        # ALWAYS filter by tenant_id
        return queryset.filter(tenant_id=tenant_id)
    
    def perform_create(self, serializer):
        """Ensure tenant_id is set on creation"""
        tenant_id = getattr(self.request.user, 'tenant_id', None) or \
                   getattr(self.request.user, 'business_id', None)
        
        if not tenant_id:
            raise ValueError("Cannot create without tenant_id")
        
        serializer.save(tenant_id=tenant_id)


class CustomerViewSet(TenantIsolatedViewSet):
    """Customer ViewSet with proper tenant isolation"""
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer_type', 'is_active']
    search_fields = ['business_name', 'first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['business_name', 'first_name', 'last_name', 'created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CustomerDetailSerializer
        return CustomerSerializer
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Dashboard stats - MUST filter by tenant"""
        # Get the filtered queryset (already tenant-filtered)
        queryset = self.get_queryset()
        
        total_customers = queryset.count()
        new_customers_30d = queryset.filter(
            created_at__gte=timezone.now() - timedelta(days=30)
        ).count()
        
        return Response({
            'total_customers': total_customers,
            'new_customers_30d': new_customers_30d,
            'tenant_id': str(request.user.tenant_id) if hasattr(request.user, 'tenant_id') else None
        })


class ContactViewSet(TenantIsolatedViewSet):
    """Contact ViewSet with proper tenant isolation"""
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'is_primary']
    search_fields = ['first_name', 'last_name', 'email', 'phone', 'job_title']
    ordering_fields = ['first_name', 'last_name', 'created_at']


class LeadViewSet(TenantIsolatedViewSet):
    """Lead ViewSet with proper tenant isolation"""
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'source', 'assigned_to']
    search_fields = ['first_name', 'last_name', 'company_name', 'email', 'phone']
    ordering_fields = ['first_name', 'last_name', 'created_at', 'status']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LeadDetailSerializer
        return LeadSerializer
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Dashboard stats - MUST filter by tenant"""
        queryset = self.get_queryset()
        
        total_leads = queryset.count()
        new_leads_30d = queryset.filter(
            created_at__gte=timezone.now() - timedelta(days=30)
        ).count()
        leads_by_status = queryset.values('status').annotate(count=Count('id'))
        leads_by_source = queryset.values('source').annotate(count=Count('id'))
        
        return Response({
            'total_leads': total_leads,
            'new_leads_30d': new_leads_30d,
            'leads_by_status': list(leads_by_status),
            'leads_by_source': list(leads_by_source),
            'tenant_id': str(request.user.tenant_id) if hasattr(request.user, 'tenant_id') else None
        })


class OpportunityViewSet(TenantIsolatedViewSet):
    """Opportunity ViewSet with proper tenant isolation"""
    queryset = Opportunity.objects.all()
    serializer_class = OpportunitySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['stage', 'customer', 'assigned_to']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'amount', 'close_date', 'created_at']
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Dashboard stats - MUST filter by tenant"""
        queryset = self.get_queryset()
        
        total_opportunities = queryset.count()
        total_value = queryset.aggregate(total=Sum('amount'))['total'] or 0
        opportunities_by_stage = queryset.values('stage').annotate(
            count=Count('id'),
            value=Sum('amount')
        )
        
        return Response({
            'total_opportunities': total_opportunities,
            'total_value': total_value,
            'opportunities_by_stage': list(opportunities_by_stage),
            'tenant_id': str(request.user.tenant_id) if hasattr(request.user, 'tenant_id') else None
        })


class DealViewSet(TenantIsolatedViewSet):
    """Deal ViewSet with proper tenant isolation"""
    queryset = Deal.objects.all()
    serializer_class = DealSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'customer', 'assigned_to']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'amount', 'close_date', 'created_at']
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Dashboard stats - MUST filter by tenant"""
        queryset = self.get_queryset()
        
        total_deals = queryset.count()
        total_value = queryset.aggregate(total=Sum('amount'))['total'] or 0
        deals_by_status = queryset.values('status').annotate(
            count=Count('id'),
            value=Sum('amount')
        )
        
        return Response({
            'total_deals': total_deals,
            'total_value': total_value,
            'deals_by_status': list(deals_by_status),
            'tenant_id': str(request.user.tenant_id) if hasattr(request.user, 'tenant_id') else None
        })


class ActivityViewSet(TenantIsolatedViewSet):
    """Activity ViewSet with proper tenant isolation"""
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'status', 'customer', 'lead', 'assigned_to']
    search_fields = ['subject', 'description']
    ordering_fields = ['scheduled_at', 'created_at']


class CampaignViewSet(TenantIsolatedViewSet):
    """Campaign ViewSet with proper tenant isolation"""
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'status']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'start_date', 'end_date', 'created_at']
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Dashboard stats - MUST filter by tenant"""
        queryset = self.get_queryset()
        
        total_campaigns = queryset.count()
        active_campaigns = queryset.filter(status='active').count()
        campaigns_by_type = queryset.values('type').annotate(count=Count('id'))
        campaigns_by_status = queryset.values('status').annotate(count=Count('id'))
        
        return Response({
            'total_campaigns': total_campaigns,
            'active_campaigns': active_campaigns,
            'campaigns_by_type': list(campaigns_by_type),
            'campaigns_by_status': list(campaigns_by_status),
            'tenant_id': str(request.user.tenant_id) if hasattr(request.user, 'tenant_id') else None
        })


class CampaignMemberViewSet(TenantIsolatedViewSet):
    """CampaignMember ViewSet with proper tenant isolation"""
    queryset = CampaignMember.objects.all()
    serializer_class = CampaignSerializer  # Use CampaignSerializer temporarily
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['campaign', 'status']
    search_fields = ['contact__first_name', 'contact__last_name', 'lead__first_name', 'lead__last_name']
    ordering_fields = ['created_at', 'status']