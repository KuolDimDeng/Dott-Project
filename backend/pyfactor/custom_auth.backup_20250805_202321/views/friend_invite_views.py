from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_friend_invitation(request):
    """
    Send an invitation to a friend/business owner to try Dott.
    This is different from RBAC invitations - it doesn't create a user account.
    """
    try:
        # Extract data from request
        to_email = request.data.get('to_email', '').strip()
        message = request.data.get('message', '')
        sender_name = request.data.get('sender_name', '')
        sender_email = request.data.get('sender_email', request.user.email)
        invite_url = request.data.get('invite_url', 'https://dottapps.com/auth/signup')
        
        # Validate email
        if not to_email or '@' not in to_email:
            return Response(
                {'error': 'Valid email address is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prepare email content
        subject = request.data.get('subject', f'{sender_name} invited you to Dott: All-in-One Business Management Platform')
        
        # HTML email template
        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">You're Invited to Dott!</h2>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="white-space: pre-wrap;">{message}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{invite_url}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Start Your Free Trial
                    </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="font-size: 14px; color: #6b7280;">
                    This invitation was sent by {sender_name} ({sender_email}). 
                    If you have any questions, feel free to reach out to them directly.
                </p>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        plain_message = strip_tags(message)
        
        # Use configured FROM email or fallback
        from_email = settings.DEFAULT_FROM_EMAIL or 'no-reply@dottapps.com'
        
        # Send email
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=[to_email],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Friend invitation sent from {sender_email} to {to_email}")
        
        return Response({
            'success': True,
            'message': 'Invitation sent successfully',
            'invitation_id': f'friend-invite-{request.user.id}-{to_email}-{int(timezone.now().timestamp())}'
        })
        
    except Exception as e:
        logger.error(f"Failed to send friend invitation: {str(e)}")
        return Response(
            {'error': 'Failed to send invitation. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )