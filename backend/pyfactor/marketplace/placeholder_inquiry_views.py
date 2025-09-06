"""
Placeholder business inquiry handling with SMS/WhatsApp notifications
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models, transaction
from django.utils import timezone
from business.models import PlaceholderBusiness
from business.sms_service import sms_service
from marketplace.models import BusinessListing
import logging

logger = logging.getLogger(__name__)


class PlaceholderInquiry(models.Model):
    """Track consumer inquiries on placeholder businesses"""
    placeholder_business = models.ForeignKey(PlaceholderBusiness, on_delete=models.CASCADE, related_name='inquiries')
    consumer = models.ForeignKey('custom_auth.User', on_delete=models.CASCADE)
    inquiry_type = models.CharField(max_length=50, choices=[
        ('view', 'Viewed'),
        ('call', 'Called'),
        ('message', 'Messaged'),
        ('order', 'Attempted Order'),
    ])
    message = models.TextField(blank=True)
    notification_sent = models.BooleanField(default=False)
    notification_type = models.CharField(max_length=20, blank=True)  # 'sms' or 'whatsapp'
    notification_response = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'marketplace_placeholder_inquiries'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_placeholder_inquiry(request):
    """
    Handle consumer inquiry on placeholder business
    Sends SMS/WhatsApp notification to the business owner
    """
    try:
        business_id = request.data.get('business_id')
        inquiry_type = request.data.get('inquiry_type', 'view')
        message = request.data.get('message', '')
        
        # Get the placeholder business
        try:
            # First check if it's in marketplace_business_listing with placeholder tag
            listing = BusinessListing.objects.filter(
                id=business_id,
                search_tags__contains=['placeholder']
            ).first()
            
            if listing:
                # Get the original placeholder business
                placeholder = PlaceholderBusiness.objects.filter(
                    user_id=listing.business_id
                ).first()
            else:
                # Direct placeholder business lookup
                placeholder = PlaceholderBusiness.objects.get(id=business_id)
                
        except (BusinessListing.DoesNotExist, PlaceholderBusiness.DoesNotExist):
            return Response({
                'success': False,
                'message': 'Business not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if not placeholder:
            return Response({
                'success': False,
                'message': 'Placeholder business not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if business can be contacted
        if not placeholder.can_be_contacted():
            reason = 'opted out' if placeholder.opted_out else 'contact limit reached'
            return Response({
                'success': False,
                'message': f'Cannot contact this business: {reason}',
                'can_contact': False,
                'opted_out': placeholder.opted_out,
                'contact_limit_reached': placeholder.contact_limit_reached
            })
        
        # Get consumer info
        consumer = request.user
        consumer_name = consumer.get_full_name() or consumer.business_name or 'A customer'
        
        # Create inquiry record
        inquiry = PlaceholderInquiry.objects.create(
            placeholder_business=placeholder,
            consumer=consumer,
            inquiry_type=inquiry_type,
            message=message
        )
        
        # Prepare the customer request message
        if inquiry_type == 'order':
            customer_request = f"Wants to place an order: {message}" if message else "Wants to place an order"
        elif inquiry_type == 'message':
            customer_request = message or "Has a question about your business"
        elif inquiry_type == 'call':
            customer_request = "Wants to contact you"
        else:
            customer_request = "Is interested in your business"
        
        # Send SMS notification
        notification_result = sms_service.send_business_contact_sms(
            business_phone=placeholder.phone,
            business_name=placeholder.name,
            customer_name=consumer_name,
            customer_request=customer_request,
            business_id=str(placeholder.id),
            business_address=placeholder.address or "",
            business_category=placeholder.category or ""
        )
        
        # Update inquiry with notification result
        inquiry.notification_sent = notification_result.get('success', False)
        inquiry.notification_type = 'sms'
        inquiry.notification_response = notification_result
        inquiry.save()
        
        # Increment contact count if SMS was sent successfully
        if notification_result.get('success'):
            placeholder.increment_contact_count()
            
            return Response({
                'success': True,
                'message': 'Business owner has been notified',
                'notification_sent': True,
                'remaining_contacts': placeholder.get_remaining_contacts(),
                'inquiry_id': inquiry.id
            })
        else:
            return Response({
                'success': False,
                'message': 'Could not notify business owner',
                'error': notification_result.get('error', 'Unknown error'),
                'inquiry_id': inquiry.id
            })
            
    except Exception as e:
        logger.error(f"Error handling placeholder inquiry: {str(e)}")
        return Response({
            'success': False,
            'message': 'Error processing inquiry',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_placeholder_status(request, business_id):
    """
    Check if a business is a placeholder and if it can be contacted
    """
    try:
        # Check in marketplace listings first
        listing = BusinessListing.objects.filter(
            id=business_id
        ).first()
        
        if listing:
            # Check if it's a placeholder
            is_placeholder = 'placeholder' in (listing.search_tags or [])
            
            if is_placeholder:
                # Get the original placeholder business
                placeholder = PlaceholderBusiness.objects.filter(
                    user_id=listing.business_id
                ).first()
                
                if placeholder:
                    return Response({
                        'success': True,
                        'is_placeholder': True,
                        'can_contact': placeholder.can_be_contacted(),
                        'remaining_contacts': placeholder.get_remaining_contacts(),
                        'opted_out': placeholder.opted_out,
                        'converted': placeholder.converted_to_real_business,
                        'contact_count': placeholder.contact_count,
                        'max_contacts': placeholder.max_contact_limit
                    })
            
            return Response({
                'success': True,
                'is_placeholder': False,
                'is_verified': listing.is_verified
            })
        
        # Try direct placeholder lookup
        try:
            placeholder = PlaceholderBusiness.objects.get(id=business_id)
            return Response({
                'success': True,
                'is_placeholder': True,
                'can_contact': placeholder.can_be_contacted(),
                'remaining_contacts': placeholder.get_remaining_contacts(),
                'opted_out': placeholder.opted_out,
                'converted': placeholder.converted_to_real_business,
                'contact_count': placeholder.contact_count,
                'max_contacts': placeholder.max_contact_limit
            })
        except PlaceholderBusiness.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Business not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"Error checking placeholder status: {str(e)}")
        return Response({
            'success': False,
            'message': 'Error checking business status',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)