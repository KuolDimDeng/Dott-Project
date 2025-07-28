from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image
import io
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

def resize_image_if_needed(file, max_width=800, max_height=800):
    """Resize image if it's too large, maintaining aspect ratio"""
    try:
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
        
        # Create new InMemoryUploadedFile
        return InMemoryUploadedFile(
            output,
            'ImageField',
            f"{file.name.split('.')[0]}.{img_format.lower()}",
            f'image/{img_format.lower()}',
            output.getbuffer().nbytes,
            None
        )
    except Exception as e:
        logger.error(f"Image resize error: {str(e)}")
        return file

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_business_logo(request):
    """Upload business logo"""
    try:
        # Get user's business
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response({'error': 'No business found for user'}, status=404)
        
        # Check if logo file is provided
        if 'logo' not in request.FILES:
            return Response({'error': 'No logo file provided'}, status=400)
        
        logo_file = request.FILES['logo']
        
        # Validate the image
        is_valid, error_message = validate_image_file(logo_file)
        if not is_valid:
            return Response({'error': error_message}, status=400)
        
        # Resize if needed
        logo_file = resize_image_if_needed(logo_file)
        
        # Get or create BusinessDetails
        business_details, created = BusinessDetails.objects.get_or_create(
            business=business,
            defaults={
                'legal_structure': 'SOLE_PROPRIETORSHIP',
                'country': 'US'
            }
        )
        
        # Delete old logo if exists
        if business_details.logo:
            business_details.logo.delete()
        
        # Save new logo
        business_details.logo = logo_file
        business_details.save()
        
        logger.info(f"Business logo uploaded successfully for business {business.id}")
        
        return Response({
            'success': True,
            'message': 'Logo uploaded successfully',
            'logo_url': business_details.logo.url if business_details.logo else None
        })
        
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=404)
    except Exception as e:
        logger.error(f"Error uploading business logo: {str(e)}")
        return Response({'error': 'Failed to upload logo'}, status=500)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_business_logo(request):
    """Delete business logo"""
    try:
        # Get user's business
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response({'error': 'No business found for user'}, status=404)
        
        # Get BusinessDetails
        try:
            business_details = BusinessDetails.objects.get(business=business)
            
            if business_details.logo:
                business_details.logo.delete()
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
        # Get user's business
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response({'error': 'No business found for user'}, status=404)
        
        # Get BusinessDetails
        try:
            business_details = BusinessDetails.objects.get(business=business)
            
            return Response({
                'success': True,
                'logo_url': business_details.logo.url if business_details.logo else None,
                'has_logo': bool(business_details.logo)
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