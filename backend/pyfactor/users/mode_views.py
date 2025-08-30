from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_mode(request):
    """
    Get current user mode and available modes
    """
    try:
        profile = request.user.userprofile
        
        # Determine available modes
        available_modes = []
        if profile.has_business_access or request.user.is_business:
            available_modes.append('business')
        if profile.has_consumer_access:
            available_modes.append('consumer')
        
        # If user has no modes set, give them consumer access by default
        if not available_modes:
            profile.has_consumer_access = True
            profile.user_mode = 'consumer'
            profile.default_mode = 'consumer'
            profile.save()
            available_modes = ['consumer']
        
        return Response({
            'success': True,
            'current_mode': profile.user_mode,
            'default_mode': profile.default_mode,
            'available_modes': available_modes,
            'has_business_access': profile.has_business_access or request.user.is_business,
            'has_consumer_access': profile.has_consumer_access,
            'business_name': profile.business_name if profile.business_name else None
        })
    except Exception as e:
        # Create profile if it doesn't exist
        from users.models import UserProfile
        profile = UserProfile.objects.create(
            user=request.user,
            has_consumer_access=True,
            has_business_access=request.user.is_business if hasattr(request.user, 'is_business') else False,
            user_mode='consumer',
            default_mode='consumer'
        )
        
        return Response({
            'success': True,
            'current_mode': 'consumer',
            'default_mode': 'consumer',
            'available_modes': ['consumer'],
            'has_business_access': False,
            'has_consumer_access': True,
            'business_name': None
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def switch_mode(request):
    """
    Switch between business and consumer mode
    """
    new_mode = request.data.get('mode')
    
    if new_mode not in ['business', 'consumer']:
        return Response({
            'success': False,
            'error': 'Invalid mode. Must be "business" or "consumer"'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        profile = request.user.userprofile
        
        # Check if user has access to requested mode
        if new_mode == 'business' and not (profile.has_business_access or request.user.is_business):
            return Response({
                'success': False,
                'error': 'You do not have access to business mode. Please complete business registration.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if new_mode == 'consumer' and not profile.has_consumer_access:
            return Response({
                'success': False,
                'error': 'Consumer mode is not available for your account.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Switch mode
        old_mode = profile.user_mode
        profile.user_mode = new_mode
        profile.last_mode_switch = timezone.now()
        profile.save()
        
        # Log the switch
        print(f"User {request.user.email} switched from {old_mode} to {new_mode}")
        
        return Response({
            'success': True,
            'message': f'Switched to {new_mode} mode',
            'current_mode': new_mode,
            'previous_mode': old_mode
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_default_mode(request):
    """
    Set the default mode for login
    """
    default_mode = request.data.get('default_mode')
    
    if default_mode not in ['business', 'consumer']:
        return Response({
            'success': False,
            'error': 'Invalid mode. Must be "business" or "consumer"'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        profile = request.user.userprofile
        
        # Check access
        if default_mode == 'business' and not (profile.has_business_access or request.user.is_business):
            return Response({
                'success': False,
                'error': 'Cannot set business as default without business access'
            }, status=status.HTTP_403_FORBIDDEN)
        
        profile.default_mode = default_mode
        profile.save()
        
        return Response({
            'success': True,
            'message': f'Default mode set to {default_mode}',
            'default_mode': default_mode
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enable_business_mode(request):
    """
    Enable business mode for a user (after business registration)
    """
    business_name = request.data.get('business_name')
    business_type = request.data.get('business_type')
    
    if not business_name:
        return Response({
            'success': False,
            'error': 'Business name is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        profile = request.user.userprofile
        
        # Enable business mode
        profile.has_business_access = True
        profile.business_name = business_name
        profile.business_type = business_type
        
        # If this is their first mode, set it as current
        if not profile.user_mode:
            profile.user_mode = 'business'
            profile.default_mode = 'business'
        
        profile.save()
        
        # Update user flag
        request.user.is_business = True
        request.user.save()
        
        # Create marketplace listing
        from marketplace.models import BusinessListing
        BusinessListing.objects.get_or_create(
            business=request.user,
            defaults={
                'primary_category': 'other',
                'country': profile.country or '',
                'city': profile.city or '',
            }
        )
        
        return Response({
            'success': True,
            'message': 'Business mode enabled successfully',
            'has_business_access': True,
            'business_name': business_name
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)