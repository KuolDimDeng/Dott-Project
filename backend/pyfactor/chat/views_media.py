"""
Media upload views for chat with Cloudinary integration
Optimized for African mobile networks
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.utils import timezone
from django.conf import settings
import logging

from services.cloudinary_service import cloudinary_service
from .models import ChatMessage, ChatConversation

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_voice_note(request, conversation_id):
    """
    Upload voice note to Cloudinary (optimized for Africa)
    
    Accepts audio files and stores them with bandwidth optimization
    """
    try:
        # Get conversation
        conversation = ChatConversation.objects.get(
            id=conversation_id,
            is_active=True
        )
        
        # Verify user has access
        user = request.user
        if user not in [conversation.consumer, conversation.business]:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get audio file
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response(
                {'error': 'No audio file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check file size (max 10MB for voice notes)
        if audio_file.size > 10 * 1024 * 1024:
            return Response(
                {'error': 'Audio file too large. Maximum 10MB allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Upload to Cloudinary
        upload_result = cloudinary_service.upload_voice_note(
            file_data=audio_file,
            conversation_id=str(conversation_id),
            user_id=str(user.id)
        )
        
        # Create chat message with voice note
        sender_type = 'consumer' if user == conversation.consumer else 'business'
        
        message = ChatMessage.objects.create(
            conversation=conversation,
            sender=user,
            sender_type=sender_type,
            message_type='voice',
            voice_url=upload_result['url'],
            text_content=f"Voice message ({upload_result.get('duration', 0)}s)",
            is_delivered=True,
            delivered_at=timezone.now()
        )
        
        # Update conversation
        conversation.last_message_at = timezone.now()
        if sender_type == 'consumer':
            conversation.business_unread_count += 1
        else:
            conversation.consumer_unread_count += 1
        conversation.save()
        
        # Return response with both URLs for bandwidth adaptation
        return Response({
            'success': True,
            'message_id': str(message.id),
            'voice_url': upload_result['url'],
            'low_bandwidth_url': upload_result.get('low_bandwidth_url'),
            'duration': upload_result.get('duration', 0),
            'size': upload_result['size'],
            'created_at': message.created_at.isoformat()
        }, status=status.HTTP_201_CREATED)
        
    except ChatConversation.DoesNotExist:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Failed to upload voice note: {e}")
        return Response(
            {'error': 'Failed to upload voice note'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_image(request, conversation_id):
    """
    Upload image to Cloudinary with automatic optimization for Africa
    
    Images are automatically compressed and converted to WebP where supported
    """
    try:
        # Get conversation
        conversation = ChatConversation.objects.get(
            id=conversation_id,
            is_active=True
        )
        
        # Verify user has access
        user = request.user
        if user not in [conversation.consumer, conversation.business]:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get image file
        image_file = request.FILES.get('image')
        if not image_file:
            return Response(
                {'error': 'No image file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check file size (max 25MB for images)
        if image_file.size > 25 * 1024 * 1024:
            return Response(
                {'error': 'Image file too large. Maximum 25MB allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Upload to Cloudinary
        upload_result = cloudinary_service.upload_image(
            file_data=image_file,
            purpose='chat',
            user_id=str(user.id)
        )
        
        # Create chat message with image
        sender_type = 'consumer' if user == conversation.consumer else 'business'
        caption = request.data.get('caption', '')
        
        message = ChatMessage.objects.create(
            conversation=conversation,
            sender=user,
            sender_type=sender_type,
            message_type='image',
            image_url=upload_result['url'],
            text_content=caption or 'Image',
            is_delivered=True,
            delivered_at=timezone.now()
        )
        
        # Update conversation
        conversation.last_message_at = timezone.now()
        if sender_type == 'consumer':
            conversation.business_unread_count += 1
        else:
            conversation.consumer_unread_count += 1
        conversation.save()
        
        # Return multiple URLs for different bandwidth scenarios
        return Response({
            'success': True,
            'message_id': str(message.id),
            'image_url': upload_result['url'],
            'thumbnail_url': upload_result.get('thumbnail_url'),
            'medium_url': upload_result.get('medium_url'),
            'width': upload_result['width'],
            'height': upload_result['height'],
            'size': upload_result['size'],
            'created_at': message.created_at.isoformat()
        }, status=status.HTTP_201_CREATED)
        
    except ChatConversation.DoesNotExist:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Failed to upload image: {e}")
        return Response(
            {'error': 'Failed to upload image'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_video(request, conversation_id):
    """
    Upload video to Cloudinary with heavy optimization for African bandwidth
    
    Videos are compressed and multiple quality versions are created
    """
    try:
        # Get conversation
        conversation = ChatConversation.objects.get(
            id=conversation_id,
            is_active=True
        )
        
        # Verify user has access
        user = request.user
        if user not in [conversation.consumer, conversation.business]:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get video file
        video_file = request.FILES.get('video')
        if not video_file:
            return Response(
                {'error': 'No video file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check file size (max 50MB for videos)
        if video_file.size > 50 * 1024 * 1024:
            return Response(
                {'error': 'Video file too large. Maximum 50MB allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Upload to Cloudinary
        upload_result = cloudinary_service.upload_video(
            file_data=video_file,
            conversation_id=str(conversation_id)
        )
        
        # Create chat message with video
        sender_type = 'consumer' if user == conversation.consumer else 'business'
        
        message = ChatMessage.objects.create(
            conversation=conversation,
            sender=user,
            sender_type=sender_type,
            message_type='video',
            # Store video URL in image_url field (we can rename later)
            image_url=upload_result['url'],
            text_content=f"Video ({upload_result.get('duration', 0)}s)",
            is_delivered=True,
            delivered_at=timezone.now()
        )
        
        # Update conversation
        conversation.last_message_at = timezone.now()
        if sender_type == 'consumer':
            conversation.business_unread_count += 1
        else:
            conversation.consumer_unread_count += 1
        conversation.save()
        
        # Return multiple quality URLs
        return Response({
            'success': True,
            'message_id': str(message.id),
            'video_url': upload_result['url'],
            'thumbnail_url': upload_result.get('thumbnail_url'),
            'low_bandwidth_url': upload_result.get('low_bandwidth_url'),
            'duration': upload_result.get('duration', 0),
            'size': upload_result['size'],
            'created_at': message.created_at.isoformat()
        }, status=status.HTTP_201_CREATED)
        
    except ChatConversation.DoesNotExist:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Failed to upload video: {e}")
        return Response(
            {'error': 'Failed to upload video'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_cloudinary_usage(request):
    """
    Get current Cloudinary usage statistics
    Helps monitor FREE tier limits
    """
    try:
        # Only allow staff/admin to check usage
        if not request.user.is_staff:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        usage = cloudinary_service.get_usage_stats()
        
        # Add warnings if approaching limits
        warnings = []
        if usage.get('storage_percentage', 0) > 80:
            warnings.append('Storage usage above 80% of FREE tier limit')
        if usage.get('bandwidth_percentage', 0) > 80:
            warnings.append('Bandwidth usage above 80% of FREE tier limit')
        
        return Response({
            'success': True,
            'usage': usage,
            'warnings': warnings,
            'free_tier_limits': {
                'storage_gb': 25,
                'bandwidth_gb': 25,
                'transformations': 7500,
                'note': 'Cloudinary FREE tier for Africa deployment'
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to get Cloudinary usage: {e}")
        return Response(
            {'error': 'Failed to get usage statistics'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )