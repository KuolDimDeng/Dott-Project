"""
Profile-related API views for user account management
"""
import os
import uuid
try:
    from PIL import Image
except ImportError:
    import Image
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from pyfactor.logging_config import get_logger

logger = get_logger()


class ProfilePhotoUploadView(APIView):
    """
    Handle profile photo uploads for authenticated users
    """
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request, format=None):
        """
        Upload a profile photo
        """
        try:
            logger.info(f"Profile photo upload request from user: {request.user.email}")
            
            # Check if file was provided
            if 'photo' not in request.FILES:
                return Response(
                    {"error": "No photo file provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            photo_file = request.FILES['photo']
            
            # Validate file type
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
            if photo_file.content_type not in allowed_types:
                return Response(
                    {"error": f"Invalid file type. Allowed types: {', '.join(allowed_types)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate file size (max 5MB)
            max_size = 5 * 1024 * 1024  # 5MB
            if photo_file.size > max_size:
                return Response(
                    {"error": "File size too large. Maximum size is 5MB"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Process the image
            try:
                img = Image.open(photo_file)
                
                # Convert to RGB if necessary (for PNG with transparency)
                if img.mode in ('RGBA', 'P'):
                    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                    rgb_img.paste(img, mask=img.split()[3] if img.mode == 'RGBA' else None)
                    img = rgb_img
                
                # Resize to 400x400 maintaining aspect ratio
                img.thumbnail((400, 400), Image.Resampling.LANCZOS)
                
                # Create a square image with white background
                square_img = Image.new('RGB', (400, 400), (255, 255, 255))
                # Paste the resized image in the center
                offset = ((400 - img.width) // 2, (400 - img.height) // 2)
                square_img.paste(img, offset)
                
                # Save processed image
                from io import BytesIO
                output = BytesIO()
                square_img.save(output, format='JPEG', quality=85)
                output.seek(0)
                
                # Generate unique filename
                filename = f"profile_{request.user.id}_{uuid.uuid4().hex}.jpg"
                
                # Save to media directory
                if hasattr(settings, 'MEDIA_ROOT'):
                    # Create profile_photos directory if it doesn't exist
                    profile_photos_dir = os.path.join(settings.MEDIA_ROOT, 'profile_photos')
                    os.makedirs(profile_photos_dir, exist_ok=True)
                    
                    # Save file
                    file_path = os.path.join('profile_photos', filename)
                    saved_path = default_storage.save(file_path, ContentFile(output.read()))
                    
                    # Generate URL
                    photo_url = request.build_absolute_uri(default_storage.url(saved_path))
                else:
                    # Fallback: Return data URL if no media storage configured
                    import base64
                    output.seek(0)
                    encoded_string = base64.b64encode(output.read()).decode()
                    photo_url = f"data:image/jpeg;base64,{encoded_string}"
                
                # Update user profile picture URL
                user = request.user
                user.picture = photo_url
                user.save(update_fields=['picture'])
                
                # Also update in UserProfile if it exists
                if hasattr(user, 'profile'):
                    profile = user.profile
                    if hasattr(profile, 'metadata'):
                        if not profile.metadata:
                            profile.metadata = {}
                        profile.metadata['profile_photo_url'] = photo_url
                        profile.metadata['profile_photo_updated_at'] = timezone.now().isoformat()
                        profile.save(update_fields=['metadata'])
                
                logger.info(f"Successfully uploaded profile photo for user: {request.user.email}")
                
                return Response({
                    "photoUrl": photo_url,
                    "message": "Profile photo uploaded successfully"
                }, status=status.HTTP_200_OK)
                
            except Exception as e:
                logger.error(f"Error processing image: {str(e)}")
                return Response(
                    {"error": "Failed to process image"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Error uploading profile photo: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to upload profile photo"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserProfileView(APIView):
    """
    Enhanced profile endpoint with additional user information
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get enhanced user profile data
        """
        try:
            user = request.user
            
            # Get full name - try multiple sources
            full_name = user.get_full_name()
            if not full_name or full_name.strip() == '':
                # Try from User model fields
                if hasattr(user, 'name') and user.name:
                    full_name = user.name
                elif hasattr(user, 'given_name') and hasattr(user, 'family_name'):
                    full_name = f"{user.given_name or ''} {user.family_name or ''}".strip()
                else:
                    full_name = user.email.split('@')[0]  # Fallback to email prefix
            
            # Get first and last name
            first_name = user.first_name or getattr(user, 'given_name', '')
            last_name = user.last_name or getattr(user, 'family_name', '')
            
            # If names are empty, try to parse from full name
            if (not first_name or not last_name) and full_name and full_name != user.email.split('@')[0]:
                name_parts = full_name.split(' ', 1)
                if not first_name:
                    first_name = name_parts[0]
                if not last_name and len(name_parts) > 1:
                    last_name = name_parts[1]
            
            # Get username/nickname
            username = getattr(user, 'username', None)
            if not username:
                username = getattr(user, 'nickname', None)
            if not username:
                username = user.email.split('@')[0]
            
            # Build profile data
            profile_data = {
                "id": str(user.id),
                "email": user.email,
                "name": full_name or user.email,
                "firstName": first_name,
                "lastName": last_name,
                "first_name": first_name,  # Both formats for compatibility
                "last_name": last_name,
                "username": username,
                "nickname": username,  # Alias
                "picture": user.picture,
                "profilePhoto": user.picture,  # Alias for frontend compatibility
                "profile_photo": user.picture,  # Another alias
                "email_verified": getattr(user, 'email_verified', True),
                "phone_number": getattr(user, 'phone_number', None),
                "created_at": user.date_joined.isoformat() if hasattr(user, 'date_joined') else None,
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "mfa_enabled": getattr(user, 'mfa_enabled', False),
                "multifactor": getattr(user, 'multifactor', []),
            }
            
            # Add profile-specific data if UserProfile exists
            if hasattr(user, 'profile'):
                profile = user.profile
                # Override phone number from profile if available
                if profile.phone_number:
                    profile_data["phone_number"] = profile.phone_number
                
                # Get business info if available
                business_info = {}
                if profile.business:
                    business_info = {
                        "businessName": profile.business.name,
                        "business_name": profile.business.name,  # Both formats for compatibility
                        "businessType": profile.business.business_type,
                        "business_type": profile.business.business_type,
                        "business_address": profile.business.address if hasattr(profile.business, 'address') else None,
                        "business_phone": profile.business.phone if hasattr(profile.business, 'phone') else None,
                        "business_email": profile.business.email if hasattr(profile.business, 'email') else None,
                    }
                
                profile_data.update({
                    "occupation": profile.occupation,
                    "street": profile.street,
                    "city": profile.city,
                    "state": profile.state,
                    "postcode": profile.postcode,
                    "country": str(profile.country) if profile.country else None,
                    **business_info  # Spread business info
                })
                
                # Check metadata for profile photo URL
                if hasattr(profile, 'metadata') and profile.metadata:
                    if 'profile_photo_url' in profile.metadata:
                        profile_data["picture"] = profile.metadata['profile_photo_url']
                        profile_data["profilePhoto"] = profile.metadata['profile_photo_url']
                        profile_data["profile_photo"] = profile.metadata['profile_photo_url']
            
            # Add tenant/subscription data
            tenant_id = None
            if hasattr(user, 'tenant_id') and user.tenant_id:
                tenant_id = str(user.tenant_id)
            elif hasattr(user, 'tenant') and user.tenant:
                tenant_id = str(user.tenant.id)
            elif hasattr(user, 'profile') and user.profile.tenant_id:
                tenant_id = str(user.profile.tenant_id)
            
            if tenant_id:
                profile_data["tenantId"] = tenant_id
                profile_data["tenant_id"] = tenant_id
            
            # Add role information
            profile_data["role"] = getattr(user, 'role', 'USER')
            
            # Add subscription info
            profile_data["subscription_plan"] = getattr(user, 'subscription_plan', 'free')
            profile_data["subscriptionPlan"] = profile_data["subscription_plan"]
            
            return Response(profile_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching user profile: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to fetch profile data"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def put(self, request):
        """
        Update user profile data
        """
        try:
            user = request.user
            data = request.data
            
            logger.info(f"Profile update request from user: {user.email} with data: {data}")
            
            # Update first and last name
            if 'first_name' in data:
                user.first_name = data['first_name']
                if hasattr(user, 'given_name'):
                    user.given_name = data['first_name']
            
            if 'last_name' in data:
                user.last_name = data['last_name']
                if hasattr(user, 'family_name'):
                    user.family_name = data['last_name']
            
            # Update full name
            if 'name' in data:
                user.name = data['name']
            elif 'first_name' in data and 'last_name' in data:
                full_name = f"{data['first_name']} {data['last_name']}".strip()
                if hasattr(user, 'name'):
                    user.name = full_name
            
            # Update phone number
            if 'phone_number' in data:
                if hasattr(user, 'phone_number'):
                    user.phone_number = data['phone_number']
                # Also update in UserProfile if it exists
                if hasattr(user, 'profile'):
                    user.profile.phone_number = data['phone_number']
                    user.profile.save(update_fields=['phone_number'])
            
            # Save user changes
            update_fields = []
            if 'first_name' in data:
                update_fields.append('first_name')
            if 'last_name' in data:
                update_fields.append('last_name')
            if hasattr(user, 'name') and 'name' in data:
                update_fields.append('name')
            if hasattr(user, 'given_name') and 'first_name' in data:
                update_fields.append('given_name')
            if hasattr(user, 'family_name') and 'last_name' in data:
                update_fields.append('family_name')
            if hasattr(user, 'phone_number') and 'phone_number' in data:
                update_fields.append('phone_number')
            
            if update_fields:
                user.save(update_fields=update_fields)
            else:
                user.save()
            
            logger.info(f"Successfully updated profile for user: {user.email}")
            
            # Return updated profile data
            return self.get(request)
            
        except Exception as e:
            logger.error(f"Error updating user profile: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to update profile"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )