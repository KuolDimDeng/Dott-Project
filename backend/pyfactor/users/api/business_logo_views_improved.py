"""
Improved business logo views using consolidated Business model.
Maintains RLS/multi-tenant architecture.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from PIL import Image
import io
import base64
import logging

# Use the new business utilities
from users.business_utils import get_user_business

logger = logging.getLogger(__name__)

# Maximum file size (5MB)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB in bytes

# Allowed image formats
ALLOWED_FORMATS = ['JPEG', 'JPG', 'PNG', 'GIF', 'WEBP']


def validate_image_file(file):
    """Validate uploaded image file"""
    # Check file size
    if file.size > MAX_FILE_SIZE:
        return False, "File size exceeds 5MB limit"
    
    # Check file format
    try:
        img = Image.open(file)
        if img.format.upper() not in ALLOWED_FORMATS:
            return False, f"Invalid image format. Allowed formats: {', '.join(ALLOWED_FORMATS)}"
        
        # Verify the image is valid
        img.verify()
        
        return True, None
    except Exception as e:
        logger.error(f"Image validation error: {str(e)}")
        return False, "Invalid image file"


def convert_image_to_base64(file, max_width=600, max_height=200):
    """Convert image to base64 data URL with optimal settings for logos"""
    try:
        # Reset file position to start
        if hasattr(file, 'seek'):
            file.seek(0)
        
        img = Image.open(file)
        original_format = img.format or 'PNG'
        
        # For logos, we want to preserve transparency for PNG
        # Only convert to RGB if it's not PNG/GIF with transparency
        if img.mode in ('RGBA', 'LA', 'P') and original_format not in ['PNG', 'GIF']:
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if 'A' in img.mode else None)
            img = background
            img_format = 'JPEG'
        else:
            # Keep original format for PNG/GIF to preserve transparency
            img_format = original_format
        
        # Check if resize is needed - use better algorithm for logos
        if img.width > max_width or img.height > max_height:
            # Use LANCZOS for best quality downsampling
            img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
        
        # Save to BytesIO with appropriate settings
        output = io.BytesIO()
        if img_format == 'PNG':
            # PNG: Use best compression
            img.save(output, format='PNG', optimize=True)
        elif img_format == 'JPEG':
            # JPEG: Higher quality for logos
            img.save(output, format='JPEG', quality=95, optimize=True)
        else:
            # Other formats: Keep original
            img.save(output, format=img_format)
        
        output.seek(0)
        
        # Convert to base64
        encoded_string = base64.b64encode(output.read()).decode('utf-8')
        
        # Determine MIME type
        mime_type = f'image/{img_format.lower()}'
        
        # Return data URL
        return f"data:{mime_type};base64,{encoded_string}"
    except Exception as e:
        logger.error(f"Image to base64 conversion error: {str(e)}")
        raise


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_business_logo(request):
    """Upload business logo (improved version using consolidated model)"""
    try:
        logger.info(f"[Logo Upload] Request from user: {request.user.email}")
        
        # Get user's business using improved utility
        business = get_user_business(request.user)
        
        if not business:
            logger.error(f"[Logo Upload] No business found for user {request.user.email}")
            return Response({
                'success': False,
                'error': 'No business associated with user'
            }, status=status.HTTP_404_NOT_FOUND)
        
        logger.info(f"[Logo Upload] Business found: {business.name} (ID: {business.id})")
        
        # Check if logo file is provided
        if 'logo' not in request.FILES:
            logger.error(f"[Logo Upload] No logo file in request")
            return Response({
                'success': False,
                'error': 'No logo file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logo_file = request.FILES['logo']
        logger.info(f"[Logo Upload] File received: {logo_file.name}, size: {logo_file.size}")
        
        # Validate the image
        is_valid, error_message = validate_image_file(logo_file)
        if not is_valid:
            logger.error(f"[Logo Upload] Validation failed: {error_message}")
            return Response({
                'success': False,
                'error': error_message
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Convert to base64
        logger.info(f"[Logo Upload] Converting image to base64...")
        logo_data_url = convert_image_to_base64(logo_file)
        logger.info(f"[Logo Upload] Base64 conversion completed, size: {len(logo_data_url)} chars")
        
        # Save logo directly to Business model
        business.logo_data = logo_data_url
        business.save(update_fields=['logo_data'])
        
        logger.info(f"[Logo Upload] Logo saved successfully for business {business.name}")
        
        # Clear cache to ensure fresh data
        from users.business_utils import invalidate_business_cache
        invalidate_business_cache(business)
        
        return Response({
            'success': True,
            'message': 'Logo uploaded successfully',
            'logo_data': logo_data_url,  # Return the base64 data URL directly
            'business': {
                'id': str(business.id),
                'name': business.name
            }
        })
        
    except Exception as e:
        logger.error(f"[Logo Upload] Error: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': f'Failed to upload logo: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_business_logo(request):
    """Delete business logo (improved version)"""
    try:
        logger.info(f"[Logo Delete] Request from user: {request.user.email}")
        
        # Get user's business using improved utility
        business = get_user_business(request.user)
        
        if not business:
            return Response({
                'success': False,
                'error': 'No business associated with user'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if business.logo_data:
            # Clear logo data
            business.logo_data = None
            business.save(update_fields=['logo_data'])
            
            # Clear cache
            from users.business_utils import invalidate_business_cache
            invalidate_business_cache(business)
            
            logger.info(f"[Logo Delete] Logo deleted for business {business.name}")
            
            return Response({
                'success': True,
                'message': 'Logo deleted successfully'
            })
        else:
            return Response({
                'success': False,
                'error': 'No logo to delete'
            }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        logger.error(f"[Logo Delete] Error: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Failed to delete logo'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_business_logo(request):
    """Get business logo (improved version)"""
    try:
        logger.info(f"[Logo Get] Request from user: {request.user.email}")
        
        # Get user's business using improved utility
        business = get_user_business(request.user)
        
        if not business:
            # Return success with no logo rather than error
            # This is graceful handling for users without businesses
            return Response({
                'success': True,
                'logo_data': None,
                'has_logo': False,
                'message': 'No business found'
            })
        
        logger.info(f"[Logo Get] Business found: {business.name}")
        
        # Check if business has logo (now stored directly in Business model)
        has_logo = bool(business.logo_data)
        
        return Response({
            'success': True,
            'logo_data': business.logo_data if has_logo else None,
            'has_logo': has_logo,
            'business': {
                'id': str(business.id),
                'name': business.name
            }
        })
        
    except Exception as e:
        logger.error(f"[Logo Get] Error: {str(e)}", exc_info=True)
        # Return graceful response even on error
        return Response({
            'success': True,
            'logo_data': None,
            'has_logo': False,
            'message': 'Error retrieving logo'
        })