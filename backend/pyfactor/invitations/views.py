import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from communications.whatsapp_service import whatsapp_service

# Import Lead models for saving invitations
from leads.models import Lead, LeadActivity

logger = logging.getLogger(__name__)


def save_invitation_lead(invitation_type, contact_info, sender_name, sender_email, message, request, recipient_name='', company_name=''):
    """
    Helper function to save invitation data as a lead
    
    Args:
        invitation_type: 'email' or 'whatsapp'
        contact_info: email address or phone number
        sender_name: name of the person sending invitation
        sender_email: email of the person sending invitation  
        message: invitation message content
        request: Django request object
    """
    try:
        logger.info(f'[LeadSave] === SAVING INVITATION AS LEAD ===')
        logger.info(f'[LeadSave] Type: {invitation_type}, Contact: {contact_info}')
        
        # Get client IP for tracking
        # Handle the case where get_client_ip might not be available
        client_ip = None
        try:
            # Temporarily handle import issue
            try:
                from ipware import get_client_ip
                client_ip, _ = get_client_ip(request)
            except ImportError:
                # Fallback function
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                if x_forwarded_for:
                    client_ip = x_forwarded_for.split(',')[0]
                else:
                    client_ip = request.META.get('REMOTE_ADDR')
        except Exception as ip_error:
            logger.warning(f'[LeadSave] Could not get client IP: {str(ip_error)}')
        
        # Determine email and phone based on invitation type
        email = contact_info if invitation_type == 'email' else None
        phone_number = contact_info if invitation_type == 'whatsapp' else None
        
        # Parse recipient name if provided
        first_name = ''
        last_name = ''
        if recipient_name.strip():
            name_parts = recipient_name.strip().split(' ', 1)
            first_name = name_parts[0] if name_parts else ''
            last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        # Check if lead already exists for this contact and source
        source = 'invite_business_owner'
        existing_lead = Lead.objects.filter(
            email=email if email else '',
            phone_number=phone_number if phone_number else '',
            source=source
        ).first()
        
        if existing_lead:
            # Update existing lead with new invitation data
            lead = existing_lead
            lead.message = message
            lead.ip_address = client_ip or lead.ip_address
            
            # Update name and company if provided
            if first_name:
                lead.first_name = first_name
            if last_name:
                lead.last_name = last_name
            if company_name.strip():
                lead.company_name = company_name.strip()
            
            # Update additional data with invitation details
            additional_data = lead.additional_data or {}
            additional_data.update({
                'last_invitation_type': invitation_type,
                'last_invitation_date': request.META.get('HTTP_DATE', ''),
                'sender_name': sender_name,
                'sender_email': sender_email,
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'referer': request.META.get('HTTP_REFERER', ''),
                'invitation_count': additional_data.get('invitation_count', 0) + 1
            })
            lead.additional_data = additional_data
            lead.save()
            
            # Log activity
            LeadActivity.objects.create(
                lead=lead,
                activity_type='contacted',
                description=f'Received {invitation_type} invitation from {sender_name} ({sender_email})',
                created_by=request.user if request.user.is_authenticated else None
            )
            
            logger.info(f'[LeadSave] Updated existing lead: {contact_info}')
            
        else:
            # Create new lead
            lead = Lead.objects.create(
                email=email or '',
                phone_number=phone_number or '',
                first_name=first_name,
                last_name=last_name,
                company_name=company_name.strip() if company_name.strip() else None,
                source=source,
                message=message,
                ip_address=client_ip,
                status='new',
                priority='medium',
                additional_data={
                    'invitation_type': invitation_type,
                    'invitation_date': request.META.get('HTTP_DATE', ''),
                    'sender_name': sender_name,
                    'sender_email': sender_email,
                    'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                    'referer': request.META.get('HTTP_REFERER', ''),
                    'invitation_count': 1
                }
            )
            
            # Log activity
            LeadActivity.objects.create(
                lead=lead,
                activity_type='created',
                description=f'New lead from {invitation_type} invitation sent by {sender_name} ({sender_email})',
                created_by=request.user if request.user.is_authenticated else None
            )
            
            logger.info(f'[LeadSave] Created new lead: {contact_info}')
            
        return lead
        
    except Exception as e:
        logger.error(f'[LeadSave] Failed to save lead: {str(e)}', exc_info=True)
        # Don't fail the invitation if lead saving fails
        return None


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
        recipient_name = request.data.get('recipientName', '')
        company_name = request.data.get('companyName', '')
        
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
            
            # Save invitation as lead
            try:
                lead = save_invitation_lead(
                    invitation_type='whatsapp',
                    contact_info=cleaned_phone,
                    sender_name=sender_name,
                    sender_email=sender_email,
                    message=message,
                    request=request,
                    recipient_name=recipient_name,
                    company_name=company_name
                )
                if lead:
                    logger.info(f'[WhatsApp Invite] ✅ Invitation saved as lead: {lead.id}')
                else:
                    logger.warning('[WhatsApp Invite] ⚠️ Failed to save invitation as lead')
            except Exception as lead_error:
                logger.error(f'[WhatsApp Invite] ❌ Lead saving error: {str(lead_error)}')
            
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
        recipient_name = request.data.get('recipientName', '')
        company_name = request.data.get('companyName', '')
        
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
            # Format the HTML message properly with clickable links
            # Extract the first line (title) and the rest of the message
            lines = message.split('\n', 1)
            title = lines[0] if lines else ''
            rest_of_message = lines[1] if len(lines) > 1 else ''
            
            # Make sender name blue in the title
            if sender_name and sender_name in title:
                title = title.replace(sender_name, f'<span style="color: #2563eb; font-weight: 600;">{sender_name}</span>')
            
            # Add single line break after "Hello," for better formatting
            rest_of_message = rest_of_message.replace('Hello,', 'Hello,\n')
            
            # Split content to place button after features list
            content_parts = rest_of_message.split('• Real-time business intelligence')
            features_section = content_parts[0] + '• Real-time business intelligence' if len(content_parts) > 1 else rest_of_message
            remaining_content = content_parts[1] if len(content_parts) > 1 else ''
            
            # Remove the "Get started for free forever today:" line since we have the button
            remaining_content = remaining_content.replace('Get started for free forever today: https://dottapps.com', '').strip()
            
            # Convert plain text URLs to clickable links in remaining content
            remaining_content = remaining_content.replace('https://dottapps.com', '<a href="https://dottapps.com" style="color: #2563eb; text-decoration: none; font-weight: bold;">https://dottapps.com</a>')
            
            html_message = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>You're invited to join Dott</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4; min-height: 100vh;">
                    <tr>
                        <td align="center" valign="top" style="padding: 40px 20px;">
                            <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                                <!-- Header with Logo -->
                                <tr>
                                    <td align="center" style="padding: 40px 40px 30px 40px;">
                                        <img src="https://dottapps.com/static/images/PyfactorLandingpage.png" alt="Dott" style="height: 120px; width: auto; display: block;" />
                                    </td>
                                </tr>
                                
                                <!-- Main Content -->
                                <tr>
                                    <td style="padding: 0 40px 30px 40px;">
                                        <h1 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 600; color: #1f2937; text-align: center; line-height: 1.2;">
                                            {title}
                                        </h1>
                                        
                                        <div style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 32px; white-space: pre-wrap; word-wrap: break-word;">
                                            {features_section}
                                        </div>
                                        
                                        <!-- CTA Button -->
                                        <div style="text-align: center; margin: 32px 0;">
                                            <a href="https://dottapps.com" style="display: inline-block; padding: 16px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                                                Create your Dott account
                                            </a>
                                        </div>
                                        
                                        <div style="font-size: 16px; line-height: 1.6; color: #374151; white-space: pre-wrap; word-wrap: break-word; margin: 0; padding: 0;">
                                            {remaining_content}
                                        </div>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
                                        <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.4;">
                                            This invitation was sent by <strong>{sender_name}</strong> ({sender_email}) via Dott.
                                        </p>
                                        <p style="margin: 16px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                            Dott: Global Business Platform | <a href="https://dottapps.com" style="color: #2563eb; text-decoration: none;">dottapps.com</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
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
            logger.info(f'  - Subject: {sender_name} invites you to join Dott: Global Business Platform')
            
            logger.info('[Email Invite] 📤 Attempting to send email...')
            
            send_mail(
                subject=f'{sender_name} invites you to join Dott: Global Business Platform',
                message=message,  # Plain text fallback
                from_email=from_email,
                recipient_list=[email],
                fail_silently=False,
                html_message=html_message
            )
            
            logger.info(f'[Email Invite] ✅ Django send_mail completed successfully for {email}')
            logger.info('[Email Invite] 📮 Email should be delivered by SMTP server')
            
            # Save invitation as lead
            try:
                lead = save_invitation_lead(
                    invitation_type='email',
                    contact_info=email,
                    sender_name=sender_name,
                    sender_email=sender_email,
                    message=message,
                    request=request,
                    recipient_name=recipient_name,
                    company_name=company_name
                )
                if lead:
                    logger.info(f'[Email Invite] ✅ Invitation saved as lead: {lead.id}')
                else:
                    logger.warning('[Email Invite] ⚠️ Failed to save invitation as lead')
            except Exception as lead_error:
                logger.error(f'[Email Invite] ❌ Lead saving error: {str(lead_error)}')
            
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