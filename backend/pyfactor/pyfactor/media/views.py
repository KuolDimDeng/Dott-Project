"""
Unified Media Upload Views for Cloudinary
=========================================
Handles all image uploads across the application using Cloudinary
"""

from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.contrib.auth.decorators import login_required
import cloudinary
import cloudinary.uploader
try:
    from services.cloudinary_service import cloudinary_service
except ImportError:
    # If services is not available, create a dummy service
    cloudinary_service = None
import logging
import os

logger = logging.getLogger(__name__)

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_image(request):
    """
    Universal image upload endpoint using Cloudinary
    
    Supports multiple purposes:
    - profile: User/business profile pictures
    - logo: Business logos
    - product: Product images for marketplace
    - advertisement: Advertising campaign images
    - marketplace: General marketplace images
    """
    try:
        # Get the uploaded file
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({
                'success': False,
                'message': 'No image file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get purpose (what the image is for)
        purpose = request.data.get('purpose', 'general')
        
        # Get user ID for organization
        user_id = str(request.user.id) if request.user.is_authenticated else None
        
        # Different transformations based on purpose
        transformations = []
        folder = f"dott/{purpose}"
        eager_transformations = []
        
        if purpose == 'profile' or purpose == 'logo':
            # Profile/logo images - square format
            transformations = [
                {'width': 400, 'height': 400, 'crop': 'fill', 'gravity': 'face'},
                {'quality': 'auto:good'},
                {'fetch_format': 'auto'}
            ]
            eager_transformations = [
                {'width': 150, 'height': 150, 'crop': 'fill', 'quality': 'auto:eco'},  # Thumbnail
                {'width': 50, 'height': 50, 'crop': 'fill', 'quality': 'auto:low'}    # Mini thumbnail
            ]
            
        elif purpose == 'product' or purpose == 'marketplace':
            # Product images - maintain aspect ratio
            transformations = [
                {'width': 800, 'height': 800, 'crop': 'limit'},
                {'quality': 'auto:good'},
                {'fetch_format': 'auto'},
                {'flags': 'progressive'}  # Progressive loading for better UX
            ]
            eager_transformations = [
                {'width': 300, 'height': 300, 'crop': 'fill', 'quality': 'auto:eco'},  # Grid thumbnail
                {'width': 600, 'crop': 'limit', 'quality': 'auto:eco'}                 # Medium view
            ]
            
        elif purpose == 'advertisement':
            # Advertisement images - banner format
            transformations = [
                {'width': 1200, 'height': 628, 'crop': 'fill'},  # Facebook OG image size
                {'quality': 'auto:good'},
                {'fetch_format': 'auto'}
            ]
            eager_transformations = [
                {'width': 400, 'height': 209, 'crop': 'fill', 'quality': 'auto:eco'},  # Mobile banner
                {'width': 728, 'height': 90, 'crop': 'fill', 'quality': 'auto:eco'}    # Leaderboard
            ]
            
        else:
            # General purpose - optimize for web
            transformations = [
                {'width': 1200, 'crop': 'limit'},
                {'quality': 'auto:good'},
                {'fetch_format': 'auto'}
            ]
        
        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            image_file,
            folder=folder,
            resource_type="image",
            transformation=transformations,
            eager=eager_transformations,
            eager_async=True,  # Process transformations asynchronously
            use_filename=True,
            unique_filename=True,
            overwrite=False,
            tags=[purpose, 'dott'],
            context={'uploaded_by': user_id} if user_id else {}
        )
        
        logger.info(f"[CLOUDINARY_UPLOAD] Successfully uploaded {purpose} image: {upload_result['public_id']}")
        
        # Prepare response with all URLs
        response_data = {
            'success': True,
            'url': upload_result['secure_url'],
            'public_id': upload_result['public_id'],
            'width': upload_result.get('width'),
            'height': upload_result.get('height'),
            'format': upload_result.get('format'),
            'size': upload_result.get('bytes'),
            'purpose': purpose
        }
        
        # Add eager transformation URLs if available
        if upload_result.get('eager'):
            if len(upload_result['eager']) > 0:
                response_data['thumbnail_url'] = upload_result['eager'][0]['secure_url']
            if len(upload_result['eager']) > 1:
                response_data['small_url'] = upload_result['eager'][1]['secure_url']
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"[CLOUDINARY_UPLOAD] Error uploading image: {e}")
        return Response({
            'success': False,
            'message': f'Failed to upload image: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def delete_image(request):
    """
    Delete an image from Cloudinary
    """
    try:
        public_id = request.data.get('public_id')
        if not public_id:
            return Response({
                'success': False,
                'message': 'No public_id provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Delete from Cloudinary
        result = cloudinary.uploader.destroy(public_id)
        
        if result.get('result') == 'ok':
            logger.info(f"[CLOUDINARY_DELETE] Successfully deleted image: {public_id}")
            return Response({
                'success': True,
                'message': 'Image deleted successfully'
            })
        else:
            return Response({
                'success': False,
                'message': 'Image not found or already deleted'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"[CLOUDINARY_DELETE] Error deleting image: {e}")
        return Response({
            'success': False,
            'message': f'Failed to delete image: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_cloudinary_usage(request):
    """
    Get Cloudinary usage statistics (admin only)
    """
    try:
        # Check if user is admin
        if not request.user.is_staff:
            return Response({
                'success': False,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get usage stats from Cloudinary service
        if cloudinary_service:
            usage_stats = cloudinary_service.get_usage_stats()
        else:
            # Return mock data if service not available
            usage_stats = {
                'storage_used_gb': 0,
                'bandwidth_used_gb': 0,
                'message': 'Cloudinary service not configured'
            }
        
        return Response({
            'success': True,
            'usage': usage_stats
        })
        
    except Exception as e:
        logger.error(f"[CLOUDINARY_USAGE] Error getting usage stats: {e}")
        return Response({
            'success': False,
            'message': f'Failed to get usage stats: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)