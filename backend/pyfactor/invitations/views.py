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
        logger.info('🎯 [WhatsApp Invite] === START WHATSAPP INVITATION REQUEST ===')
        logger.info(f'[WhatsApp Invite] Request user: {request.user.email}')
        logger.info(f'[WhatsApp Invite] Request data: {request.data}')
        
        phone_number = request.data.get('phoneNumber')
        message = request.data.get('message')
        sender_name = request.data.get('senderName')
        sender_email = request.data.get('senderEmail')
        
        logger.info('[WhatsApp Invite] Extracted data:', {
            'phone_number': phone_number,
            'message_length': len(message) if message else 0,
            'sender_name': sender_name,
            'sender_email': sender_email
        })
        
        # Validate required fields
        if not phone_number or not message:
            logger.warning('[WhatsApp Invite] Missing required fields')
            return Response(
                {'error': 'Phone number and message are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Clean and validate phone number
        cleaned_phone = ''.join(c for c in phone_number if c.isdigit() or c == '+')
        logger.info(f'[WhatsApp Invite] Phone number cleaned: {phone_number} -> {cleaned_phone}')
        
        if not cleaned_phone.startswith('+') or len(cleaned_phone) < 10:
            logger.warning(f'[WhatsApp Invite] Invalid phone number format: {cleaned_phone}')
            return Response(
                {'error': 'Please provide a valid phone number with country code (e.g., +1234567890)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f'[WhatsApp Invite] Attempting to send invitation from {sender_email} to {cleaned_phone}')
        
        # Check if WhatsApp service is configured
        is_configured = whatsapp_service.is_configured()
        logger.info(f'[WhatsApp Invite] WhatsApp service configured: {is_configured}')
        logger.info(f'[WhatsApp Invite] Access token present: {bool(whatsapp_service.access_token)}')
        logger.info(f'[WhatsApp Invite] Phone number ID: {whatsapp_service.phone_number_id}')
        
        if not is_configured:
            logger.warning('[WhatsApp Invite] WhatsApp service not configured - missing access token')
            return Response(
                {'error': 'WhatsApp service is temporarily unavailable. Please try email invitation instead.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Send WhatsApp message
        logger.info('[WhatsApp Invite] Calling WhatsApp service to send message...')
        result = whatsapp_service.send_text_message(cleaned_phone, message)
        
        logger.info(f'[WhatsApp Invite] WhatsApp service result: {result}')
        
        if result:
            message_id = result.get('messages', [{}])[0].get('id')
            logger.info(f'[WhatsApp Invite] ✅ Successfully sent WhatsApp invitation to {cleaned_phone}, message_id: {message_id}')
            
            return Response({
                'success': True,
                'message': 'WhatsApp invitation sent successfully',
                'messageId': message_id
            })
        else:
            logger.error('[WhatsApp Invite] ❌ WhatsApp service returned None/False')
            return Response(
                {'error': 'Failed to send WhatsApp invitation. Please check the phone number and try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        logger.error(f'[WhatsApp Invite] ❌ Unexpected error: {str(e)}', exc_info=True)
        return Response(
            {'error': f'An unexpected error occurred: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_email_invitation(request):
    """Send email invitation to a business owner"""
    try:
        logger.info('📧 [Email Invite] === START EMAIL INVITATION REQUEST ===')
        logger.info(f'[Email Invite] Request user: {request.user.email}')
        
        email = request.data.get('email')
        message = request.data.get('message')
        sender_name = request.data.get('senderName')
        sender_email = request.data.get('senderEmail')
        
        logger.info('[Email Invite] Extracted data:', {
            'recipient_email': email,
            'message_length': len(message) if message else 0,
            'sender_name': sender_name,
            'sender_email': sender_email
        })
        
        # Validate required fields
        if not email or not message:
            logger.warning('[Email Invite] Missing required fields')
            return Response(
                {'error': 'Email and message are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f'[Email Invite] Attempting to send invitation from {sender_email} to {email}')
        
        # Use no-reply@dottapps.com as sender
        from_email = 'no-reply@dottapps.com'
        logger.info(f'[Email Invite] Using sender email: {from_email}')
        
        # Send email
        try:
            # Format the HTML message properly
            html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                        <pre style="white-space: pre-wrap; word-wrap: break-word; font-family: Arial, sans-serif;">{message}</pre>
                    </div>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
                        <p>This invitation was sent by {sender_name} ({sender_email}) via Dott.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Log email configuration
            from django.conf import settings
            logger.info('[Email Invite] 📧 Email Configuration:')
            logger.info(f'  - EMAIL_BACKEND: {settings.EMAIL_BACKEND}')
            logger.info(f'  - EMAIL_HOST: {settings.EMAIL_HOST}')
            logger.info(f'  - EMAIL_PORT: {settings.EMAIL_PORT}')
            logger.info(f'  - EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}')
            logger.info(f'  - EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}')
            logger.info(f'  - DEFAULT_FROM_EMAIL: {getattr(settings, "DEFAULT_FROM_EMAIL", "not set")}')
            logger.info(f'  - From Email: {from_email}')
            logger.info(f'  - To Email: {email}')
            logger.info(f'  - Subject: {sender_name} invites you to join Dott')
            
            logger.info('[Email Invite] 📤 Attempting to send email...')
            
            send_mail(
                subject=f'{sender_name} invites you to join Dott',
                message=message,  # Plain text fallback
                from_email=from_email,
                recipient_list=[email],
                fail_silently=False,
                html_message=html_message
            )
            
            logger.info(f'[Email Invite] ✅ Django send_mail completed successfully for {email}')
            logger.info('[Email Invite] 📮 Email should be delivered by SMTP server')
            
            return Response({
                'success': True,
                'message': 'Email invitation sent successfully'
            })
            
        except Exception as email_error:
            logger.error(f'[Email Invite] ❌ Failed to send email: {str(email_error)}', exc_info=True)
            return Response(
                {'error': f'Failed to send email invitation: {str(email_error)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        logger.error(f'[Email Invite] ❌ Unexpected error: {str(e)}', exc_info=True)
        return Response(
            {'error': f'An unexpected error occurred: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )