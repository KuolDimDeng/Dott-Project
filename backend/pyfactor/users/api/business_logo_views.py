from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image
import io
import base64
from users.models import UserProfile, BusinessDetails
from pyfactor.logging_config import get_logger

logger = get_logger()

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

def convert_image_to_base64(file, max_width=800, max_height=800):
    """Convert image to base64 data URL"""
    try:
        # Reset file position to start
        if hasattr(file, 'seek'):
            file.seek(0)
        
        img = Image.open(file)
        
        # Convert RGBA to RGB if necessary (for PNG with transparency)
        if img.mode in ('RGBA', 'LA'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        
        # Check if resize is needed
        if img.width > max_width or img.height > max_height:
            img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
        
        # Save to BytesIO
        output = io.BytesIO()
        img_format = 'JPEG' if img.format == 'WEBP' else img.format or 'JPEG'
        img.save(output, format=img_format, quality=85)
        output.seek(0)
        
        # Convert to base64
        encoded_string = base64.b64encode(output.read()).decode('utf-8')
        
        # Determine MIME type
        mime_type = 'image/jpeg' if img_format == 'JPEG' else f'image/{img_format.lower()}'
        
        # Return data URL
        return f"data:{mime_type};base64,{encoded_string}"
    except Exception as e:
        logger.error(f"Image to base64 conversion error: {str(e)}")
        raise

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_business_logo(request):
    """Upload business logo"""
    try:
        logger.info(f"[upload_business_logo] === LOGO UPLOAD REQUEST RECEIVED ===")
        logger.info(f"[upload_business_logo] Request from user: {request.user}")
        logger.info(f"[upload_business_logo] Request FILES: {list(request.FILES.keys())}")
        logger.info(f"[upload_business_logo] Request META headers: {request.META.get('CONTENT_TYPE', 'No content type')}")
        logger.info(f"[upload_business_logo] Request method: {request.method}")
        logger.info(f"[upload_business_logo] Content length: {request.META.get('CONTENT_LENGTH', 'Unknown')}")
        
        # Get user's business using select_related for better performance
        try:
            user_profile = UserProfile.objects.select_related('business').get(user=request.user)
            logger.info(f"[upload_business_logo] User profile found: {user_profile}")
            logger.info(f"[upload_business_logo] User profile ID: {user_profile.id}")
            logger.info(f"[upload_business_logo] User profile business_id: {user_profile.business_id}")
        except UserProfile.DoesNotExist:
            logger.error(f"[upload_business_logo] UserProfile not found for user: {request.user}")
            raise
        
        # Use the business relationship directly
        business = user_profile.business
        if not business:
            logger.error(f"[upload_business_logo] No business found for user {request.user}")
            logger.error(f"[upload_business_logo] UserProfile.business is None")
            logger.error(f"[upload_business_logo] UserProfile.business_id: {user_profile.business_id}")
            return Response({'error': 'No business associated with user'}, status=404)
            
        logger.info(f"[upload_business_logo] Business found: {business.id}")
        logger.info(f"[upload_business_logo] Business name: {getattr(business, 'name', 'N/A')}")
        
        # Check if logo file is provided
        if 'logo' not in request.FILES:
            logger.error(f"[upload_business_logo] No logo file in request.FILES")
            return Response({'error': 'No logo file provided'}, status=400)
        
        logo_file = request.FILES['logo']
        logger.info(f"[upload_business_logo] Logo file received: {logo_file.name}, size: {logo_file.size}")
        
        # Validate the image
        is_valid, error_message = validate_image_file(logo_file)
        if not is_valid:
            logger.error(f"[upload_business_logo] Validation failed: {error_message}")
            return Response({'error': error_message}, status=400)
        
        logger.info(f"[upload_business_logo] File validation passed")
        
        # Convert to base64
        logger.info(f"[upload_business_logo] Converting image to base64...")
        logo_data_url = convert_image_to_base64(logo_file)
        logger.info(f"[upload_business_logo] Base64 conversion completed")
        logger.info(f"[upload_business_logo] Data URL length: {len(logo_data_url)} characters")
        
        # Get or create BusinessDetails using business relationship
        logger.info(f"[upload_business_logo] Getting or creating BusinessDetails for business: {business.id}")
        try:
            business_details, created = BusinessDetails.objects.get_or_create(
                business=business,
                defaults={
                    'legal_structure': 'SOLE_PROPRIETORSHIP',
                    'country': 'US'
                }
            )
            logger.info(f"[upload_business_logo] BusinessDetails {'created' if created else 'found'}")
            logger.info(f"[upload_business_logo] BusinessDetails ID: {business_details.business_id}")
        except Exception as e:
            logger.error(f"[upload_business_logo] Error getting/creating BusinessDetails: {str(e)}")
            raise
        
        # Delete old logo if exists (clear both fields)
        if business_details.logo:
            logger.info(f"[upload_business_logo] Deleting old logo file: {business_details.logo.name}")
            business_details.logo.delete()
        
        # Save new logo as base64
        logger.info(f"[upload_business_logo] Saving new logo as base64...")
        business_details.logo_data = logo_data_url
        business_details.save()
        logger.info(f"[upload_business_logo] Logo saved successfully as base64")
        
        logger.info(f"Business logo uploaded successfully for business {business.id}")
        
        return Response({
            'success': True,
            'message': 'Logo uploaded successfully',
            'logo_url': business_details.logo_data  # Return the base64 data URL directly
        })
        
    except UserProfile.DoesNotExist:
        logger.error(f"[upload_business_logo] UserProfile.DoesNotExist for user: {request.user}")
        return Response({'error': 'User profile not found'}, status=404)
    except Exception as e:
        logger.error(f"[upload_business_logo] Unexpected error: {str(e)}")
        logger.error(f"[upload_business_logo] Error type: {type(e).__name__}")
        logger.error(f"[upload_business_logo] Error traceback:", exc_info=True)
        return Response({'error': f'Failed to upload logo: {str(e)}'}, status=500)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_business_logo(request):
    """Delete business logo"""
    try:
        # Get user's business using select_related for better performance
        user_profile = UserProfile.objects.select_related('business').get(user=request.user)
        
        business = user_profile.business
        if not business:
            return Response({'error': 'No business associated with user'}, status=404)
        
        # Get BusinessDetails
        try:
            business_details = BusinessDetails.objects.get(business=business)
            
            if business_details.logo or business_details.logo_data:
                # Delete file-based logo if exists
                if business_details.logo:
                    business_details.logo.delete()
                # Clear base64 logo data
                business_details.logo_data = None
                business_details.save()
                
                logger.info(f"Business logo deleted for business {business.id}")
                
                return Response({
                    'success': True,
                    'message': 'Logo deleted successfully'
                })
            else:
                return Response({'error': 'No logo to delete'}, status=404)
                
        except BusinessDetails.DoesNotExist:
            return Response({'error': 'No business details found'}, status=404)
        
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=404)
    except Exception as e:
        logger.error(f"Error deleting business logo: {str(e)}")
        return Response({'error': 'Failed to delete logo'}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_business_logo(request):
    """Get business logo URL"""
    try:
        # Get user's business using select_related for better performance
        user_profile = UserProfile.objects.select_related('business').get(user=request.user)
        
        business = user_profile.business
        if not business:
            return Response({'error': 'No business associated with user'}, status=404)
        
        # Get BusinessDetails
        try:
            business_details = BusinessDetails.objects.get(business=business)
            
            # Return base64 data if available, otherwise check for file-based logo
            logo_url = business_details.logo_data
            if not logo_url and business_details.logo:
                logo_url = business_details.logo.url
            
            return Response({
                'success': True,
                'logo_url': logo_url,
                'has_logo': bool(logo_url)
            })
                
        except BusinessDetails.DoesNotExist:
            return Response({
                'success': True,
                'logo_url': None,
                'has_logo': False
            })
        
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=404)
    except Exception as e:
        logger.error(f"Error getting business logo: {str(e)}")
        return Response({'error': 'Failed to get logo'}, status=500)