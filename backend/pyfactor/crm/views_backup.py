from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum
from django.utils import timezone
from datetime import timedelta
import logging

from .models import (
    Customer, Contact, Lead, Opportunity, 
    Deal, Activity, Campaign, CampaignMember
)
from .serializers import (
    CustomerSerializer, CustomerDetailSerializer,
    ContactSerializer, 
    LeadSerializer, LeadDetailSerializer,
    OpportunitySerializer, OpportunityDetailSerializer,
    DealSerializer, DealDetailSerializer,
    ActivitySerializer,
    CampaignSerializer, CampaignDetailSerializer,
    CampaignMemberSerializer
)

logger = logging.getLogger(__name__)

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['billing_country', 'billing_state', 'city']
    search_fields = ['business_name', 'first_name', 'last_name', 'email', 'phone', 'account_number']
    ordering_fields = ['business_name', 'created_at', 'updated_at']
    
    def get_queryset(self):
        """Override to ensure tenant context is properly set"""
        # Import here to avoid circular imports
        from custom_auth.rls import set_tenant_context
        
        # Set tenant context if available
        if hasattr(self.request.user, 'tenant_id') and self.request.user.tenant_id:
            logger.info(f"[CustomerViewSet] Setting tenant context from user.tenant_id: {self.request.user.tenant_id}")
            set_tenant_context(str(self.request.user.tenant_id))
        elif hasattr(self.request.user, 'business_id') and self.request.user.business_id:
            logger.info(f"[CustomerViewSet] Setting tenant context from user.business_id: {self.request.user.business_id}")
            set_tenant_context(str(self.request.user.business_id))
        
        # Use all_objects to bypass manager filtering and apply manual filtering
        queryset = Customer.all_objects.all()
        
        # Filter by user's business_id manually
        if hasattr(self.request.user, 'business_id') and self.request.user.business_id:
            queryset = queryset.filter(tenant_id=self.request.user.business_id)
            logger.info(f"[CustomerViewSet] Filtered by business_id: {self.request.user.business_id}, count: {queryset.count()}")
        
        return queryset.order_by('business_name', 'first_name', 'last_name')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CustomerDetailSerializer
        return CustomerSerializer
    
    @action(detail=True, methods=['get'])
    def contacts(self, request, pk=None):
        customer = self.get_object()
        contacts = Contact.objects.filter(customer=customer)
        serializer = ContactSerializer(contacts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def opportunities(self, request, pk=None):
        customer = self.get_object()
        opportunities = Opportunity.objects.filter(customer=customer)
        serializer = OpportunitySerializer(opportunities, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def deals(self, request, pk=None):
        customer = self.get_object()
        deals = Deal.objects.filter(customer=customer)
        serializer = DealSerializer(deals, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        customer = self.get_object()
        activities = Activity.objects.filter(customer=customer)
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_customers = Customer.objects.count()
        new_customers_30d = Customer.objects.filter(created_at__gte=timezone.now() - timedelta(days=30)).count()
        
        return Response({
            'total_customers': total_customers,
            'new_customers_30d': new_customers_30d,
        })

class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'is_primary']
    search_fields = ['first_name', 'last_name', 'email', 'phone', 'job_title']
    ordering_fields = ['first_name', 'last_name', 'created_at']

class LeadViewSet(viewsets.ModelViewSet):
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
    
    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        lead = self.get_object()
        
        # Create a new customer from the lead
        customer = Customer.objects.create(
            business_name=lead.company_name,
            first_name=lead.first_name,
            last_name=lead.last_name,
            email=lead.email,
            phone=lead.phone,
            notes=lead.notes
        )
        
        # Update the lead to mark it as converted
        lead.status = 'converted'
        lead.converted_to = customer
        lead.save()
        
        return Response({
            'message': 'Lead successfully converted to customer',
            'customer_id': customer.id
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        lead = self.get_object()
        activities = Activity.objects.filter(lead=lead)
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_leads = Lead.objects.count()
        new_leads_30d = Lead.objects.filter(created_at__gte=timezone.now() - timedelta(days=30)).count()
        leads_by_status = Lead.objects.values('status').annotate(count=Count('id'))
        leads_by_source = Lead.objects.values('source').annotate(count=Count('id'))
        
        return Response({
            'total_leads': total_leads,
            'new_leads_30d': new_leads_30d,
            'leads_by_status': leads_by_status,
            'leads_by_source': leads_by_source
        })

class OpportunityViewSet(viewsets.ModelViewSet):
    queryset = Opportunity.objects.all()
    serializer_class = OpportunitySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'stage', 'assigned_to']
    search_fields = ['name', 'customer__business_name']
    ordering_fields = ['name', 'amount', 'probability', 'expected_close_date', 'created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OpportunityDetailSerializer
        return OpportunitySerializer
    
    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        opportunity = self.get_object()
        activities = Activity.objects.filter(opportunity=opportunity)
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_opportunities = Opportunity.objects.count()
        total_value = Opportunity.objects.aggregate(total=Sum('amount'))['total'] or 0
        opportunities_by_stage = Opportunity.objects.values('stage').annotate(
            count=Count('id'),
            value=Sum('amount')
        )
        
        return Response({
            'total_opportunities': total_opportunities,
            'total_value': total_value,
            'opportunities_by_stage': opportunities_by_stage
        })

class DealViewSet(viewsets.ModelViewSet):
    queryset = Deal.objects.all()
    serializer_class = DealSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'status']
    search_fields = ['name', 'customer__business_name']
    ordering_fields = ['name', 'amount', 'start_date', 'end_date', 'created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return DealDetailSerializer
        return DealSerializer
    
    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        deal = self.get_object()
        activities = Activity.objects.filter(deal=deal)
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_deals = Deal.objects.count()
        total_value = Deal.objects.aggregate(total=Sum('amount'))['total'] or 0
        deals_by_status = Deal.objects.values('status').annotate(
            count=Count('id'),
            value=Sum('amount')
        )
        
        return Response({
            'total_deals': total_deals,
            'total_value': total_value,
            'deals_by_status': deals_by_status
        })

class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'status', 'priority', 'assigned_to', 'customer', 'lead', 'opportunity', 'deal']
    search_fields = ['subject', 'description']
    ordering_fields = ['due_date', 'created_at', 'type', 'status', 'priority']
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        upcoming_activities = Activity.objects.filter(
            due_date__gte=timezone.now(),
            due_date__lte=timezone.now() + timedelta(days=7),
            status__in=['not_started', 'in_progress']
        ).order_by('due_date')
        
        serializer = self.get_serializer(upcoming_activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        overdue_activities = Activity.objects.filter(
            due_date__lt=timezone.now(),
            status__in=['not_started', 'in_progress']
        ).order_by('due_date')
        
        serializer = self.get_serializer(overdue_activities, many=True)
        return Response(serializer.data)

class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'status']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'start_date', 'end_date', 'created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CampaignDetailSerializer
        return CampaignSerializer
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        campaign = self.get_object()
        members = CampaignMember.objects.filter(campaign=campaign)
        serializer = CampaignMemberSerializer(members, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_campaigns = Campaign.objects.count()
        active_campaigns = Campaign.objects.filter(status='active').count()
        campaigns_by_type = Campaign.objects.values('type').annotate(count=Count('id'))
        campaigns_by_status = Campaign.objects.values('status').annotate(count=Count('id'))
        
        return Response({
            'total_campaigns': total_campaigns,
            'active_campaigns': active_campaigns,
            'campaigns_by_type': campaigns_by_type,
            'campaigns_by_status': campaigns_by_status
        })

class CampaignMemberViewSet(viewsets.ModelViewSet):
    queryset = CampaignMember.objects.all()
    serializer_class = CampaignMemberSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['campaign', 'status', 'customer', 'lead']
    search_fields = ['campaign__name', 'customer__business_name', 'lead__first_name', 'lead__last_name']
    ordering_fields = ['created_at', 'status']
