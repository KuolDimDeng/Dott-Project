from rest_framework import serializers
from .models import AdvertisingCampaign, CampaignAnalytics, CampaignImpression, FeaturedBusinessSchedule
from marketplace.models import BusinessListing


class AdvertisingCampaignSerializer(serializers.ModelSerializer):
    """
    Serializer for advertising campaigns
    """
    business_name = serializers.CharField(source='business.business_name', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    remaining_budget = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        read_only=True,
        source='total_budget'
    )
    
    class Meta:
        model = AdvertisingCampaign
        fields = [
            'id', 'name', 'description', 'type', 'status',
            'total_budget', 'daily_budget', 'spent_amount', 'remaining_budget',
            'start_date', 'end_date',
            'platforms', 'target_location', 'target_audience', 'target_keywords',
            'image_url', 'banner_text', 'call_to_action', 'landing_url',
            'impressions', 'clicks', 'conversions', 'ctr', 'conversion_rate',
            'payment_status', 'payment_method', 'payment_reference',
            'business_name', 'is_active',
            'created_at', 'updated_at', 'activated_at',
        ]
        read_only_fields = [
            'id', 'spent_amount', 'impressions', 'clicks', 'conversions',
            'ctr', 'conversion_rate', 'payment_status', 'payment_reference',
            'created_at', 'updated_at', 'activated_at', 'is_active'
        ]
    
    def validate(self, data):
        """
        Validate campaign data
        """
        if 'start_date' in data and 'end_date' in data:
            if data['end_date'] <= data['start_date']:
                raise serializers.ValidationError("End date must be after start date")
        
        if 'total_budget' in data and 'daily_budget' in data:
            if data['daily_budget'] > data['total_budget']:
                raise serializers.ValidationError("Daily budget cannot exceed total budget")
        
        return data
    
    def create(self, validated_data):
        """
        Create campaign with tenant and user
        """
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
            validated_data['tenant'] = request.user.tenant
            
            # Try to get business from user
            try:
                from business.models import PlaceholderBusiness
                business = PlaceholderBusiness.objects.filter(
                    tenant=request.user.tenant
                ).first()
                if business:
                    validated_data['business'] = business
            except:
                pass
        
        return super().create(validated_data)


class CampaignAnalyticsSerializer(serializers.ModelSerializer):
    """
    Serializer for campaign analytics
    """
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)
    
    class Meta:
        model = CampaignAnalytics
        fields = [
            'id', 'campaign', 'campaign_name', 'date',
            'impressions', 'clicks', 'conversions', 'spend',
            'platform_metrics', 'hourly_metrics',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CampaignImpressionSerializer(serializers.ModelSerializer):
    """
    Serializer for campaign impressions
    """
    class Meta:
        model = CampaignImpression
        fields = [
            'id', 'campaign', 'viewer', 'viewer_location',
            'platform', 'page_url', 'position',
            'clicked', 'clicked_at', 'converted', 'converted_at',
            'cost', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class FeaturedBusinessScheduleSerializer(serializers.ModelSerializer):
    """
    Serializer for featured business schedule
    """
    business_name = serializers.CharField(source='business.business_name', read_only=True)
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)
    
    class Meta:
        model = FeaturedBusinessSchedule
        fields = [
            'id', 'business', 'business_name', 'campaign', 'campaign_name',
            'start_date', 'end_date', 'priority',
            'city', 'country', 'is_active',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CampaignImageUploadSerializer(serializers.Serializer):
    """
    Serializer for campaign image upload
    """
    image = serializers.ImageField(required=True)
    type = serializers.CharField(default='campaign')
    folder = serializers.CharField(default='campaigns')
    
    def validate_image(self, value):
        """
        Validate image file
        """
        # Check file size (max 5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Image file too large. Max size is 5MB.")
        
        # Check file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(f"Invalid file type. Allowed types: {', '.join(allowed_types)}")
        
        return value


class BusinessFeaturedStatusSerializer(serializers.Serializer):
    """
    Serializer for updating business featured status
    """
    is_featured = serializers.BooleanField(required=True)
    featured_until = serializers.DateField(required=False, allow_null=True)
    
    def update_business_listing(self, business, validated_data):
        """
        Update or create business listing with featured status
        """
        try:
            listing, created = BusinessListing.objects.get_or_create(
                business=business,
                defaults={
                    'tenant': business.tenant,
                    'is_published': True,
                    'is_visible_in_marketplace': True,
                }
            )
            
            listing.is_featured = validated_data['is_featured']
            if 'featured_until' in validated_data:
                listing.featured_until = validated_data['featured_until']
            listing.save()
            
            return listing
        except Exception as e:
            raise serializers.ValidationError(f"Failed to update featured status: {str(e)}")


class OverallAnalyticsSerializer(serializers.Serializer):
    """
    Serializer for overall advertising analytics
    """
    total_spend = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_budget = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_impressions = serializers.IntegerField()
    total_clicks = serializers.IntegerField()
    total_conversions = serializers.IntegerField()
    average_ctr = serializers.DecimalField(max_digits=5, decimal_places=2)
    average_cpc = serializers.DecimalField(max_digits=10, decimal_places=2)
    roi = serializers.DecimalField(max_digits=10, decimal_places=2)
    active_campaigns = serializers.IntegerField()
    total_campaigns = serializers.IntegerField()