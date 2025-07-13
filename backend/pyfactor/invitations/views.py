import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from communications.whatsapp_service import whatsapp_service

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_whatsapp_invitation(request):
    """Send WhatsApp invitation to a business owner"""
    try:
        phone_number = request.data.get('phoneNumber')
        message = request.data.get('message')
        sender_name = request.data.get('senderName')
        sender_email = request.data.get('senderEmail')
        
        # Validate required fields
        if not phone_number or not message:
            return Response(
                {'error': 'Phone number and message are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Clean and validate phone number
        cleaned_phone = ''.join(c for c in phone_number if c.isdigit() or c == '+')
        if not cleaned_phone.startswith('+') or len(cleaned_phone) < 10:
            return Response(
                {'error': 'Please provide a valid phone number with country code (e.g., +1234567890)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f'[WhatsApp Invite] Attempting to send invitation from {sender_email} to {cleaned_phone}')
        
        # Check if WhatsApp service is configured
        if not whatsapp_service.is_configured():
            logger.warning('[WhatsApp Invite] WhatsApp service not configured')
            return Response(
                {'error': 'WhatsApp service is temporarily unavailable. Please try email invitation instead.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Send WhatsApp message
        result = whatsapp_service.send_text_message(cleaned_phone, message)
        
        if result:
            message_id = result.get('messages', [{}])[0].get('id')
            logger.info(f'[WhatsApp Invite] Successfully sent WhatsApp invitation to {cleaned_phone}, message_id: {message_id}')
            
            # Log the invitation (you can add database logging here if needed)
            # InvitationLog.objects.create(
            #     type='whatsapp',
            #     recipient=cleaned_phone,
            #     sender=request.user,
            #     message_id=message_id
            # )
            
            return Response({
                'success': True,
                'message': 'WhatsApp invitation sent successfully',
                'messageId': message_id
            })
        else:
            return Response(
                {'error': 'Failed to send WhatsApp invitation. Please check the phone number and try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        logger.error(f'[WhatsApp Invite] Unexpected error: {str(e)}', exc_info=True)
        return Response(
            {'error': 'An unexpected error occurred. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_email_invitation(request):
    """Send email invitation to a business owner"""
    try:
        email = request.data.get('email')
        message = request.data.get('message')
        sender_name = request.data.get('senderName')
        sender_email = request.data.get('senderEmail')
        
        # Validate required fields
        if not email or not message:
            return Response(
                {'error': 'Email and message are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f'[Email Invite] Attempting to send invitation from {sender_email} to {email}')
        
        # Send email
        try:
            send_mail(
                subject=f'{sender_name} invites you to join Dott',
                message=message,  # Plain text fallback
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
                html_message=f'<pre>{message}</pre>'  # Simple HTML version
            )
            
            logger.info(f'[Email Invite] Successfully sent email invitation to {email}')
            
            return Response({
                'success': True,
                'message': 'Email invitation sent successfully'
            })
            
        except Exception as email_error:
            logger.error(f'[Email Invite] Failed to send email: {str(email_error)}')
            return Response(
                {'error': 'Failed to send email invitation. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        logger.error(f'[Email Invite] Unexpected error: {str(e)}', exc_info=True)
        return Response(
            {'error': 'An unexpected error occurred. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )