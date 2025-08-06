"""
Email views for sending general emails
"""
import logging
import re
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from django.core.mail import send_mail, EmailMessage
from django.conf import settings
from rest_framework.permissions import IsAuthenticated, AllowAny
# Temporarily handle import issue
try:
    from ipware import get_client_ip
except ImportError:
    # Fallback function
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip, True

# Import Lead model for saving contact form submissions
from leads.models import Lead, LeadActivity

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


class ContactFormView(APIView):
    """
    Public API endpoint for contact form submissions (no authentication required)
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    
    def post(self, request):
        """
        Handle contact form submissions from the landing page
        
        Request body:
        {
            "name": "Full Name",
            "email": "user@example.com",
            "company": "Company Name (optional)",
            "phone": "Phone Number (optional)",
            "subject": "general",
            "message": "Message content"
        }
        """
        try:
            # Extract form data (handle JSON, form data, and multipart)
            data = {}
            
            # Try to get data from DRF parsed request first
            if hasattr(request, 'data') and request.data:
                data = request.data
            # Fallback to raw request body for JSON
            elif hasattr(request, 'body') and request.body:
                try:
                    data = json.loads(request.body.decode('utf-8'))
                except (json.JSONDecodeError, UnicodeDecodeError):
                    pass
            # Fallback to POST data
            if not data:
                data = request.POST or {}
            
            name = str(data.get('name', '')).strip()
            email = str(data.get('email', '')).strip()
            company = str(data.get('company', '')).strip()
            phone = str(data.get('phone', '')).strip()
            subject = str(data.get('subject', 'general')).strip()
            message = str(data.get('message', '')).strip()
            
            # Validate required fields
            if not name or not email or not message:
                return Response({
                    'success': False,
                    'error': 'Missing required fields: name, email, and message are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate email format
            email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
            if not re.match(email_regex, email):
                return Response({
                    'success': False,
                    'error': 'Invalid email address format'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f'[ContactForm] Processing submission from {email}')
            
            # Get client IP for lead tracking
            client_ip, is_routable = get_client_ip(request)
            
            # Parse name into first and last name
            name_parts = name.split(' ', 1) if name else ['', '']
            first_name = name_parts[0] if name_parts else ''
            last_name = name_parts[1] if len(name_parts) > 1 else ''
            
            # Save lead to database
            try:
                # Check if lead already exists for this email from contact form
                existing_lead = Lead.objects.filter(
                    email=email, 
                    source='contact_form'
                ).first()
                
                if existing_lead:
                    # Update existing lead with new information
                    lead = existing_lead
                    lead.message = message
                    lead.first_name = first_name or lead.first_name
                    lead.last_name = last_name or lead.last_name
                    lead.company_name = company or lead.company_name
                    lead.phone_number = phone or lead.phone_number
                    lead.ip_address = client_ip or lead.ip_address
                    
                    # Update additional data with form details
                    additional_data = lead.additional_data or {}
                    additional_data.update({
                        'form_subject': subject,
                        'last_submission_date': request.META.get('HTTP_DATE', ''),
                        'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                        'referer': request.META.get('HTTP_REFERER', ''),
                    })
                    lead.additional_data = additional_data
                    lead.save()
                    
                    # Log activity
                    LeadActivity.objects.create(
                        lead=lead,
                        activity_type='contacted',
                        description=f"Updated contact form submission: {subject.replace('_', ' ').title()}",
                        created_by=None
                    )
                    
                    logger.info(f'[ContactForm] Updated existing lead: {email}')
                    
                else:
                    # Create new lead
                    lead = Lead.objects.create(
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        company_name=company,
                        phone_number=phone,
                        source='contact_form',
                        message=message,
                        ip_address=client_ip,
                        additional_data={
                            'form_subject': subject,
                            'submission_date': request.META.get('HTTP_DATE', ''),
                            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                            'referer': request.META.get('HTTP_REFERER', ''),
                        }
                    )
                    
                    # Log activity
                    LeadActivity.objects.create(
                        lead=lead,
                        activity_type='created',
                        description=f"New contact form submission: {subject.replace('_', ' ').title()}",
                        created_by=None
                    )
                    
                    logger.info(f'[ContactForm] Created new lead: {email}')
                    
            except Exception as e:
                logger.error(f'[ContactForm] Failed to save lead to database: {str(e)}')
                # Continue with email sending even if lead creation fails
            
            # Format the email content for support team
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">New Contact Form Submission</h2>
                
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 10px 0;"><strong>Name:</strong> {name}</p>
                    <p style="margin: 10px 0;"><strong>Email:</strong> {email}</p>
                    {f'<p style="margin: 10px 0;"><strong>Company:</strong> {company}</p>' if company else ''}
                    {f'<p style="margin: 10px 0;"><strong>Phone:</strong> {phone}</p>' if phone else ''}
                    <p style="margin: 10px 0;"><strong>Subject:</strong> {subject.replace('_', ' ').title()}</p>
                </div>
                
                <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h3 style="color: #333; margin-top: 0;">Message:</h3>
                    <p style="white-space: pre-wrap; color: #555;">{message}</p>
                </div>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                
                <p style="color: #999; font-size: 12px;">
                    This message was sent from the contact form on dottapps.com
                </p>
            </div>
            """
            
            text_content = f"""
New Contact Form Submission

Name: {name}
Email: {email}
{f'Company: {company}' if company else ''}
{f'Phone: {phone}' if phone else ''}
Subject: {subject.replace('_', ' ').title()}

Message:
{message}

---
This message was sent from the contact form on dottapps.com
            """
            
            # Send email to support team
            support_email = EmailMessage(
                subject=f"[Contact Form] {subject.replace('_', ' ').title()} - From {name}",
                body=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=['support@dottapps.com'],
                reply_to=[email]
            )
            support_email.content_subtype = 'html'
            support_email.send(fail_silently=False)
            
            # Send auto-reply to the user
            auto_reply_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Thank you for contacting Dott!</h2>
                
                <p style="color: #555; line-height: 1.6;">
                    Dear {name},
                </p>
                
                <p style="color: #555; line-height: 1.6;">
                    We've received your message and appreciate you taking the time to reach out to us. 
                    Our support team will review your inquiry and get back to you as soon as possible, 
                    typically within 24-48 hours.
                </p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0; color: #666;"><strong>Your submission details:</strong></p>
                    <p style="margin: 5px 0; color: #666;">Subject: {subject.replace('_', ' ').title()}</p>
                    <p style="margin: 5px 0; color: #666;">Submitted on: {request.META.get('HTTP_DATE', 'Today')}</p>
                </div>
                
                <p style="color: #555; line-height: 1.6;">
                    If you have any urgent matters, please don't hesitate to follow up with us at 
                    <a href="mailto:support@dottapps.com" style="color: #0066cc;">support@dottapps.com</a>.
                </p>
                
                <p style="color: #555; line-height: 1.6;">
                    Best regards,<br>
                    The Dott Support Team
                </p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                
                <p style="color: #999; font-size: 12px;">
                    This is an automated response. Please do not reply directly to this email.
                </p>
            </div>
            """
            
            auto_reply_text = f"""
Thank you for contacting Dott!

Dear {name},

We've received your message and appreciate you taking the time to reach out to us. 
Our support team will review your inquiry and get back to you as soon as possible, 
typically within 24-48 hours.

Your submission details:
Subject: {subject.replace('_', ' ').title()}
Submitted on: Today

If you have any urgent matters, please don't hesitate to follow up with us at 
support@dottapps.com.

Best regards,
The Dott Support Team

---
This is an automated response. Please do not reply directly to this email.
            """
            
            # Send auto-reply (non-blocking)
            try:
                auto_reply = EmailMessage(
                    subject="Thank you for contacting Dott - We've received your message",
                    body=auto_reply_html,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[email]
                )
                auto_reply.content_subtype = 'html'
                auto_reply.send(fail_silently=True)  # Don't fail the whole request if auto-reply fails
                logger.info(f'[ContactForm] Auto-reply sent to {email}')
            except Exception as e:
                logger.error(f'[ContactForm] Failed to send auto-reply to {email}: {str(e)}')
            
            logger.info(f'[ContactForm] Contact form submission processed successfully from {email}')
            
            return Response({
                'success': True,
                'message': "Your message has been sent successfully. We'll get back to you soon!"
            })
            
        except Exception as e:
            logger.error(f'[ContactForm] Error processing contact form: {str(e)}')
            return Response({
                'success': False,
                'error': 'An unexpected error occurred. Please try again later or email us directly at support@dottapps.com'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)