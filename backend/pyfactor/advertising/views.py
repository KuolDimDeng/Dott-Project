import os
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
import cloudinary
import cloudinary.uploader

from .models import AdvertisingCampaign, CampaignAnalytics, CampaignImpression, FeaturedBusinessSchedule
from .serializers import (
    AdvertisingCampaignSerializer,
    CampaignAnalyticsSerializer,
    CampaignImpressionSerializer,
    FeaturedBusinessScheduleSerializer,
    CampaignImageUploadSerializer,
    BusinessFeaturedStatusSerializer,
    OverallAnalyticsSerializer,
)
from marketplace.models import BusinessListing
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from core.authentication.session_token_auth import SessionTokenAuthentication

logger = logging.getLogger(__name__)

# Configure Cloudinary if not already configured
if os.environ.get('CLOUDINARY_CLOUD_NAME'):
    cloudinary.config(
        cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
        api_key=os.environ.get('CLOUDINARY_API_KEY'),
        api_secret=os.environ.get('CLOUDINARY_API_SECRET')
    )


class AdvertisingCampaignViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing advertising campaigns
    """
    serializer_class = AdvertisingCampaignSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    
    def get_queryset(self):
        """
        Filter campaigns by tenant
        """
        if not hasattr(self.request.user, 'tenant'):
            return AdvertisingCampaign.objects.none()
        
        queryset = AdvertisingCampaign.objects.filter(
            tenant=self.request.user.tenant
        )
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by type if provided
        type_filter = self.request.query_params.get('type')
        if type_filter:
            queryset = queryset.filter(type=type_filter)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activate a campaign after payment
        """
        try:
            campaign = self.get_object()
            
            # Verify payment (integrate with your payment system)
            payment_data = request.data
            # TODO: Verify payment with Stripe/payment provider
            
            # Activate the campaign
            campaign.activate()
            
            # Create featured schedule if it's a featured campaign
            if campaign.type == 'featured' and campaign.business:
                FeaturedBusinessSchedule.objects.create(
                    business=campaign.business,
                    campaign=campaign,
                    start_date=campaign.start_date,
                    end_date=campaign.end_date,
                    priority=2 if campaign.type == 'premium' else 1,
                    city=campaign.business.city,
                    country=campaign.business.country,
                )
            
            serializer = self.get_serializer(campaign)
            return Response({
                'success': True,
                'message': 'Campaign activated successfully',
                'data': serializer.data
            })
        except Exception as e:
            logger.error(f"Error activating campaign: {e}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """
        Pause an active campaign
        """
        try:
            campaign = self.get_object()
            
            if campaign.status != 'active':
                return Response({
                    'success': False,
                    'message': 'Only active campaigns can be paused'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            campaign.pause()
            serializer = self.get_serializer(campaign)
            
            return Response({
                'success': True,
                'message': 'Campaign paused successfully',
                'data': serializer.data
            })
        except Exception as e:
            logger.error(f"Error pausing campaign: {e}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """
        Resume a paused campaign
        """
        try:
            campaign = self.get_object()
            
            if campaign.status != 'paused':
                return Response({
                    'success': False,
                    'message': 'Only paused campaigns can be resumed'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            campaign.resume()
            serializer = self.get_serializer(campaign)
            
            return Response({
                'success': True,
                'message': 'Campaign resumed successfully',
                'data': serializer.data
            })
        except Exception as e:
            logger.error(f"Error resuming campaign: {e}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def publish_to_marketplace(self, request, pk=None):
        """
        Publish a campaign to the marketplace
        """
        try:
            campaign = self.get_object()

            # Check if campaign can be published
            if campaign.status not in ['active', 'pending_payment']:
                return Response({
                    'success': False,
                    'message': 'Only active or pending campaigns can be published to marketplace'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Publish to marketplace
            listing = campaign.publish_to_marketplace()

            if listing:
                return Response({
                    'success': True,
                    'message': 'Campaign successfully published to marketplace',
                    'data': {
                        'campaign_id': str(campaign.id),
                        'listing_id': str(listing.id),
                        'is_featured': campaign.type == 'featured',
                        'visibility_boost': campaign.marketplace_visibility_boost
                    }
                })
            else:
                return Response({
                    'success': False,
                    'message': 'Failed to publish to marketplace. Please check business profile is complete.'
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error publishing to marketplace: {e}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """
        Get analytics for a specific campaign
        """
        try:
            campaign = self.get_object()
            
            # Get date range from query params
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Default to last 30 days
            if not end_date:
                end_date = timezone.now().date()
            else:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            if not start_date:
                start_date = end_date - timedelta(days=30)
            else:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            
            # Get daily analytics
            daily_analytics = CampaignAnalytics.objects.filter(
                campaign=campaign,
                date__gte=start_date,
                date__lte=end_date
            ).order_by('date')
            
            # Calculate totals
            totals = daily_analytics.aggregate(
                total_impressions=Sum('impressions'),
                total_clicks=Sum('clicks'),
                total_conversions=Sum('conversions'),
                total_spend=Sum('spend')
            )
            
            # Calculate averages
            if totals['total_impressions'] and totals['total_impressions'] > 0:
                ctr = (totals['total_clicks'] or 0) / totals['total_impressions'] * 100
            else:
                ctr = 0
            
            if totals['total_clicks'] and totals['total_clicks'] > 0:
                conversion_rate = (totals['total_conversions'] or 0) / totals['total_clicks'] * 100
                cpc = (totals['total_spend'] or 0) / totals['total_clicks']
            else:
                conversion_rate = 0
                cpc = 0
            
            serializer = CampaignAnalyticsSerializer(daily_analytics, many=True)
            
            return Response({
                'success': True,
                'campaign': {
                    'id': str(campaign.id),
                    'name': campaign.name,
                    'type': campaign.type,
                    'status': campaign.status,
                },
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                },
                'totals': {
                    'impressions': totals['total_impressions'] or 0,
                    'clicks': totals['total_clicks'] or 0,
                    'conversions': totals['total_conversions'] or 0,
                    'spend': float(totals['total_spend'] or 0),
                    'ctr': round(ctr, 2),
                    'conversion_rate': round(conversion_rate, 2),
                    'cpc': round(cpc, 2),
                },
                'daily_data': serializer.data
            })
        except Exception as e:
            logger.error(f"Error getting campaign analytics: {e}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request):
        """
        Upload campaign image to Cloudinary with support for different image types
        """
        try:
            serializer = CampaignImageUploadSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

            image = serializer.validated_data['image']
            folder = serializer.validated_data.get('folder', 'campaigns')
            image_type = serializer.validated_data.get('image_type', 'general')

            # Different transformations based on image type
            transformations = {
                'logo': [
                    {'width': 400, 'height': 400, 'crop': 'fill'},
                    {'quality': 'auto:best'},
                    {'fetch_format': 'auto'}
                ],
                'cover': [
                    {'width': 1200, 'height': 628, 'crop': 'fill'},
                    {'quality': 'auto:good'},
                    {'fetch_format': 'auto'}
                ],
                'gallery': [
                    {'width': 800, 'height': 600, 'crop': 'fill'},
                    {'quality': 'auto:good'},
                    {'fetch_format': 'auto'}
                ],
                'banner': [
                    {'width': 1920, 'height': 600, 'crop': 'fill'},
                    {'quality': 'auto:good'},
                    {'fetch_format': 'auto'}
                ],
                'general': [
                    {'width': 1200, 'height': 628, 'crop': 'fill'},
                    {'quality': 'auto:good'},
                    {'fetch_format': 'auto'}
                ]
            }

            # Upload to Cloudinary with appropriate transformation
            upload_result = cloudinary.uploader.upload(
                image,
                folder=f"dott/{folder}/{image_type}",
                resource_type="image",
                transformation=transformations.get(image_type, transformations['general'])
            )

            return Response({
                'success': True,
                'url': upload_result['secure_url'],
                'public_id': upload_result['public_id'],
                'width': upload_result.get('width'),
                'height': upload_result.get('height'),
                'format': upload_result.get('format'),
                'image_type': image_type,
            })
        except Exception as e:
            logger.error(f"Error uploading campaign image: {e}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def update_images(self, request, pk=None):
        """
        Update campaign images (logo, cover, gallery) after upload
        """
        try:
            campaign = self.get_object()
            image_type = request.data.get('image_type')
            url = request.data.get('url')
            public_id = request.data.get('public_id')

            if not image_type or not url:
                return Response({
                    'success': False,
                    'message': 'image_type and url are required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Update appropriate field based on image type
            if image_type == 'logo':
                campaign.logo_url = url
                campaign.logo_public_id = public_id
            elif image_type == 'cover':
                campaign.cover_image_url = url
                campaign.cover_image_public_id = public_id
            elif image_type == 'gallery':
                # Add to gallery images list
                if not campaign.gallery_images:
                    campaign.gallery_images = []
                campaign.gallery_images.append({
                    'url': url,
                    'public_id': public_id,
                    'uploaded_at': timezone.now().isoformat()
                })
            else:
                campaign.image_url = url
                campaign.cloudinary_public_id = public_id

            campaign.save()

            # If campaign is active and auto-publish is enabled, update marketplace
            if campaign.status == 'active' and campaign.auto_publish_to_marketplace:
                campaign.publish_to_marketplace()

            return Response({
                'success': True,
                'message': f'{image_type} image updated successfully',
                'data': {
                    'campaign_id': str(campaign.id),
                    'image_type': image_type,
                    'url': url
                }
            })
        except Exception as e:
            logger.error(f"Error updating campaign images: {e}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdvertisingAnalyticsViewSet(viewsets.ViewSet):
    """
    ViewSet for advertising analytics
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    
    def list(self, request):
        """
        Get overall advertising analytics for the business
        """
        try:
            if not hasattr(request.user, 'tenant'):
                return Response({
                    'success': False,
                    'message': 'No business associated with user'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get all campaigns for the tenant
            campaigns = AdvertisingCampaign.objects.filter(
                tenant=request.user.tenant
            )
            
            # Calculate totals
            totals = campaigns.aggregate(
                total_budget=Sum('total_budget'),
                total_spend=Sum('spent_amount'),
                total_impressions=Sum('impressions'),
                total_clicks=Sum('clicks'),
                total_conversions=Sum('conversions'),
            )
            
            # Count campaigns by status
            active_count = campaigns.filter(status='active').count()
            total_count = campaigns.count()
            
            # Calculate averages
            if totals['total_impressions'] and totals['total_impressions'] > 0:
                average_ctr = (totals['total_clicks'] or 0) / totals['total_impressions'] * 100
            else:
                average_ctr = 0
            
            if totals['total_clicks'] and totals['total_clicks'] > 0:
                average_cpc = (totals['total_spend'] or 0) / totals['total_clicks']
            else:
                average_cpc = 0
            
            # Calculate ROI (simplified - you may want to track actual revenue)
            if totals['total_spend'] and totals['total_spend'] > 0:
                # Assuming each conversion is worth $50 (customize based on your business)
                estimated_revenue = (totals['total_conversions'] or 0) * 50
                roi = ((estimated_revenue - float(totals['total_spend'])) / float(totals['total_spend'])) * 100
            else:
                roi = 0
            
            data = {
                'totalSpend': float(totals['total_spend'] or 0),
                'totalBudget': float(totals['total_budget'] or 0),
                'totalImpressions': totals['total_impressions'] or 0,
                'totalClicks': totals['total_clicks'] or 0,
                'totalConversions': totals['total_conversions'] or 0,
                'averageCTR': round(average_ctr, 2),
                'averageCPC': round(average_cpc, 2),
                'roi': round(roi, 2),
                'activeCampaigns': active_count,
                'totalCampaigns': total_count,
            }
            
            return Response(data)
        except Exception as e:
            logger.error(f"Error getting overall analytics: {e}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def featured_status(self, request):
        """
        Check if business has active featured campaign
        """
        try:
            if not hasattr(request.user, 'tenant'):
                return Response({
                    'is_featured': False,
                    'expires_at': None
                })
            
            # Check for active featured campaigns
            active_featured = AdvertisingCampaign.objects.filter(
                tenant=request.user.tenant,
                type='featured',
                status='active',
                end_date__gte=timezone.now().date()
            ).first()
            
            if active_featured:
                return Response({
                    'is_featured': True,
                    'expires_at': active_featured.end_date.isoformat(),
                    'campaign_id': str(active_featured.id),
                    'campaign_name': active_featured.name,
                })
            
            return Response({
                'is_featured': False,
                'expires_at': None
            })
        except Exception as e:
            logger.error(f"Error checking featured status: {e}")
            return Response({
                'is_featured': False,
                'expires_at': None
            })
    
    @action(detail=False, methods=['get'])
    def featured_options(self, request):
        """
        Get available featured placement options
        """
        try:
            options = [
                {
                    'id': 'featured_7',
                    'name': 'Featured for 7 Days',
                    'price': 50,
                    'duration_days': 7,
                    'benefits': [
                        'Top placement in marketplace search',
                        'Featured badge on your listing',
                        'Priority in discovery feed',
                        'Email support',
                    ],
                },
                {
                    'id': 'featured_30',
                    'name': 'Featured for 30 Days',
                    'price': 150,
                    'duration_days': 30,
                    'benefits': [
                        'Top placement in marketplace search',
                        'Featured badge on your listing',
                        'Priority in discovery feed',
                        'Homepage spotlight (weekly rotation)',
                        'Priority email support',
                        '20% discount',
                    ],
                },
                {
                    'id': 'premium_30',
                    'name': 'Premium Package - 30 Days',
                    'price': 250,
                    'duration_days': 30,
                    'benefits': [
                        'Guaranteed #1 placement in your category',
                        'Premium featured badge',
                        'Homepage banner (3 days/week)',
                        'Push notifications to customers',
                        'Detailed analytics dashboard',
                        'Dedicated account manager',
                        'Custom promotional materials',
                    ],
                },
            ]
            
            return Response({
                'success': True,
                'data': options
            })
        except Exception as e:
            logger.error(f"Error getting featured options: {e}")
            return Response({
                'success': False,
                'message': str(e),
                'data': []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BusinessFeaturedStatusViewSet(viewsets.ViewSet):
    """
    ViewSet for managing business featured status
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    
    @action(detail=False, methods=['patch'], url_path='update-featured')
    def update_featured(self, request):
        """
        Update business featured status (called after campaign activation)
        """
        try:
            serializer = BusinessFeaturedStatusSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get business for the user
            from business.models import PlaceholderBusiness
            business = PlaceholderBusiness.objects.filter(
                tenant=request.user.tenant
            ).first()
            
            if not business:
                return Response({
                    'success': False,
                    'message': 'No business found for user'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Update business listing
            listing = serializer.update_business_listing(business, serializer.validated_data)
            
            return Response({
                'success': True,
                'message': 'Featured status updated successfully',
                'data': {
                    'business_id': str(business.id),
                    'business_name': business.business_name,
                    'is_featured': listing.is_featured,
                    'featured_until': listing.featured_until.isoformat() if listing.featured_until else None,
                }
            })
        except Exception as e:
            logger.error(f"Error updating featured status: {e}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)