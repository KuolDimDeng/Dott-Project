from rest_framework import serializers
from .models import (
    Customer, Contact, Lead, Opportunity, 
    Deal, Activity, Campaign, CampaignMember
)

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('id', 'accountNumber', 'created_at', 'updated_at')

class ContactSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Contact
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_customer_name(self, obj):
        return obj.customer.customerName if obj.customer else None

class LeadSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Lead
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_assigned_to_name(self, obj):
        return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}" if obj.assigned_to else None

class OpportunitySerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Opportunity
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_customer_name(self, obj):
        return obj.customer.customerName if obj.customer else None
    
    def get_assigned_to_name(self, obj):
        return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}" if obj.assigned_to else None

class DealSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Deal
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_customer_name(self, obj):
        return obj.customer.customerName if obj.customer else None

class ActivitySerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    related_to = serializers.SerializerMethodField()
    
    class Meta:
        model = Activity
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_assigned_to_name(self, obj):
        return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}" if obj.assigned_to else None
    
    def get_related_to(self, obj):
        if obj.customer:
            return {
                'type': 'customer',
                'id': str(obj.customer.id),
                'name': obj.customer.customerName
            }
        elif obj.lead:
            return {
                'type': 'lead',
                'id': str(obj.lead.id),
                'name': f"{obj.lead.first_name} {obj.lead.last_name}"
            }
        elif obj.opportunity:
            return {
                'type': 'opportunity',
                'id': str(obj.opportunity.id),
                'name': obj.opportunity.name
            }
        elif obj.deal:
            return {
                'type': 'deal',
                'id': str(obj.deal.id),
                'name': obj.deal.name
            }
        return None

class CampaignSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Campaign
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_member_count(self, obj):
        return obj.members.count()

class CampaignMemberSerializer(serializers.ModelSerializer):
    campaign_name = serializers.SerializerMethodField()
    member_name = serializers.SerializerMethodField()
    member_type = serializers.SerializerMethodField()
    
    class Meta:
        model = CampaignMember
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_campaign_name(self, obj):
        return obj.campaign.name if obj.campaign else None
    
    def get_member_name(self, obj):
        if obj.customer:
            return obj.customer.customerName
        elif obj.lead:
            return f"{obj.lead.first_name} {obj.lead.last_name}"
        return None
    
    def get_member_type(self, obj):
        if obj.customer:
            return 'customer'
        elif obj.lead:
            return 'lead'
        return None

# Nested serializers for detailed views
class CustomerDetailSerializer(CustomerSerializer):
    contacts = ContactSerializer(many=True, read_only=True)
    opportunities = OpportunitySerializer(many=True, read_only=True)
    deals = DealSerializer(many=True, read_only=True)
    activities = ActivitySerializer(many=True, read_only=True)
    campaigns = CampaignMemberSerializer(many=True, read_only=True)
    
    class Meta(CustomerSerializer.Meta):
        fields = CustomerSerializer.Meta.fields

class LeadDetailSerializer(LeadSerializer):
    activities = ActivitySerializer(many=True, read_only=True)
    campaigns = CampaignMemberSerializer(many=True, read_only=True)
    
    class Meta(LeadSerializer.Meta):
        fields = LeadSerializer.Meta.fields

class OpportunityDetailSerializer(OpportunitySerializer):
    activities = ActivitySerializer(many=True, read_only=True)
    deal = DealSerializer(read_only=True)
    
    class Meta(OpportunitySerializer.Meta):
        fields = OpportunitySerializer.Meta.fields

class DealDetailSerializer(DealSerializer):
    activities = ActivitySerializer(many=True, read_only=True)
    opportunity = OpportunitySerializer(read_only=True)
    
    class Meta(DealSerializer.Meta):
        fields = DealSerializer.Meta.fields

class CampaignDetailSerializer(CampaignSerializer):
    members = CampaignMemberSerializer(many=True, read_only=True)
    
    class Meta(CampaignSerializer.Meta):
        fields = CampaignSerializer.Meta.fields