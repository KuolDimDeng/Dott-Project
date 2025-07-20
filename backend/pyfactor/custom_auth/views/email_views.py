"""
Email views for sending general emails
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.mail import send_mail, EmailMessage
from django.conf import settings
from custom_auth.api.permissions import IsAuthenticated

logger = logging.getLogger(__name__)

class SendEmailView(APIView):
    """
    API endpoint for sending emails using Resend backend
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Send an email
        
        Request body:
        {
            "to": "recipient@example.com",
            "subject": "Email subject",
            "html_content": "<p>HTML content</p>",
            "text_content": "Plain text content",
            "reply_to": "sender@example.com"
        }
        """
        try:
            # Extract email parameters
            to_email = request.data.get('to')
            subject = request.data.get('subject')
            html_content = request.data.get('html_content')
            text_content = request.data.get('text_content', '')
            reply_to = request.data.get('reply_to')
            
            # Validate required fields
            if not to_email or not subject:
                return Response({
                    'success': False,
                    'error': 'Missing required fields: to and subject'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f'[SendEmail] Sending email to {to_email}')
            
            # Create email message
            from_email = settings.DEFAULT_FROM_EMAIL
            email = EmailMessage(
                subject=subject,
                body=text_content,
                from_email=from_email,
                to=[to_email],
                reply_to=[reply_to] if reply_to else None
            )
            
            # Add HTML alternative if provided
            if html_content:
                email.content_subtype = 'html'
                email.body = html_content
                
                # Also attach plain text version
                if text_content:
                    email.attach_alternative(text_content, 'text/plain')
            
            # Send the email
            email.send(fail_silently=False)
            
            logger.info(f'[SendEmail] Email sent successfully to {to_email}')
            
            return Response({
                'success': True,
                'message': 'Email sent successfully',
                'message_id': f'resend_{to_email}_{subject[:10]}'  # Mock message ID
            })
            
        except Exception as e:
            logger.error(f'[SendEmail] Error sending email: {str(e)}')
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)