"""
Tax Filing Confirmation Generator

This module handles the generation of filing confirmation documents,
sending email/SMS notifications, and creating filing receipts.
"""

import os
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from decimal import Decimal
import logging
from io import BytesIO

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone as django_timezone
from django.db import transaction as db_transaction

# PDF generation imports
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

# SMS imports (Twilio)
try:
    from twilio.rest import Client as TwilioClient
except ImportError:
    TwilioClient = None

from ..models import (
    TaxFiling, FilingConfirmation,
    FilingNotification, NotificationStatus, NotificationType
)
from .notification_templates import (
    get_email_template, get_sms_template,
    get_confirmation_context
)

logger = logging.getLogger(__name__)


class ConfirmationGenerator:
    """Handles generation of tax filing confirmations and notifications."""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        self.twilio_client = self._setup_twilio()
    
    def _setup_custom_styles(self):
        """Setup custom styles for PDF generation."""
        # Header style
        self.styles.add(ParagraphStyle(
            name='CustomHeader',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a365d'),
            spaceAfter=30,
            alignment=TA_CENTER
        ))
        
        # Subheader style
        self.styles.add(ParagraphStyle(
            name='CustomSubheader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#2c5282'),
            spaceAfter=12,
            alignment=TA_LEFT
        ))
        
        # Info style
        self.styles.add(ParagraphStyle(
            name='InfoStyle',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#2d3748')
        ))
    
    def _setup_twilio(self) -> Optional[TwilioClient]:
        """Setup Twilio client for SMS notifications."""
        if not TwilioClient:
            logger.warning("Twilio not installed, SMS notifications disabled")
            return None
        
        account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
        auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
        
        if account_sid and auth_token:
            return TwilioClient(account_sid, auth_token)
        
        logger.warning("Twilio credentials not configured, SMS notifications disabled")
        return None
    
    @db_transaction.atomic
    def generate_confirmation(self, filing: TaxFiling) -> FilingConfirmation:
        """Generate filing confirmation for a completed tax filing."""
        try:
            # Check if confirmation already exists
            existing = FilingConfirmation.objects.filter(filing=filing).first()
            if existing:
                logger.info(f"Confirmation already exists for filing {filing.id}")
                return existing
            
            # Generate confirmation number
            confirmation_number = self._generate_confirmation_number(filing)
            
            # Generate PDF receipt
            pdf_data = self._generate_pdf_receipt(filing, confirmation_number)
            
            # Create confirmation record
            confirmation = FilingConfirmation.objects.create(
                filing=filing,
                confirmation_number=confirmation_number,
                generated_at=django_timezone.now(),
                pdf_receipt=pdf_data,
                metadata={
                    'filing_type': filing.filing_type,
                    'tax_year': filing.tax_year,
                    'state': filing.state,
                    'amount_paid': str(filing.payment_amount) if filing.payment_amount else '0.00',
                    'filing_date': filing.submitted_at.isoformat() if filing.submitted_at else None
                }
            )
            
            # Send notifications
            self._send_confirmation_notifications(confirmation)
            
            logger.info(f"Generated confirmation {confirmation_number} for filing {filing.id}")
            return confirmation
            
        except Exception as e:
            logger.error(f"Error generating confirmation for filing {filing.id}: {str(e)}")
            raise
    
    def _generate_confirmation_number(self, filing: TaxFiling) -> str:
        """Generate unique confirmation number."""
        # Format: YYYY-ST-TYPE-XXXXX
        # Example: 2024-CA-Q1-A1B2C
        year = filing.tax_year
        state = filing.state.upper() if filing.state else 'FED'
        filing_type = filing.filing_type[:2].upper()
        unique_id = uuid.uuid4().hex[:5].upper()
        
        return f"{year}-{state}-{filing_type}-{unique_id}"
    
    def _generate_pdf_receipt(self, filing: TaxFiling, confirmation_number: str) -> bytes:
        """Generate PDF filing receipt."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        # Build PDF content
        elements = []
        
        # Header
        elements.append(Paragraph(
            "Tax Filing Confirmation",
            self.styles['CustomHeader']
        ))
        
        # Confirmation number
        elements.append(Paragraph(
            f"Confirmation Number: <b>{confirmation_number}</b>",
            self.styles['CustomSubheader']
        ))
        elements.append(Spacer(1, 20))
        
        # Filing information table
        filing_data = [
            ['Filing Information', ''],
            ['Tax Year:', str(filing.tax_year)],
            ['Filing Type:', filing.get_filing_type_display()],
            ['State:', filing.state or 'Federal'],
            ['Filing Date:', filing.submitted_at.strftime('%B %d, %Y %I:%M %p') if filing.submitted_at else 'N/A'],
            ['Status:', filing.get_status_display()],
        ]
        
        if filing.payment_amount:
            filing_data.append(['Amount Paid:', f'${filing.payment_amount:,.2f}'])
        
        if filing.payment_method:
            filing_data.append(['Payment Method:', filing.payment_method])
        
        if filing.confirmation_number:
            filing_data.append(['Agency Confirmation:', filing.confirmation_number])
        
        filing_table = Table(filing_data, colWidths=[2.5*inch, 4*inch])
        filing_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e6f3ff')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1a365d')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(filing_table)
        elements.append(Spacer(1, 30))
        
        # Important information
        elements.append(Paragraph(
            "Important Information",
            self.styles['CustomSubheader']
        ))
        
        info_text = """
        <para>
        • Please keep this confirmation for your records.<br/>
        • This confirms that your tax filing has been successfully submitted.<br/>
        • Processing times vary by jurisdiction and filing type.<br/>
        • You will receive additional notifications about your filing status.<br/>
        • For questions, contact support with your confirmation number.
        </para>
        """
        
        elements.append(Paragraph(info_text, self.styles['InfoStyle']))
        elements.append(Spacer(1, 30))
        
        # Footer
        footer_text = f"""
        <para align="center">
        Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br/>
        This is an official filing receipt from Dott Tax Filing System<br/>
        </para>
        """
        
        elements.append(Paragraph(footer_text, self.styles['InfoStyle']))
        
        # Build PDF
        doc.build(elements)
        pdf_data = buffer.getvalue()
        buffer.close()
        
        return pdf_data
    
    def _send_confirmation_notifications(self, confirmation: FilingConfirmation):
        """Send confirmation notifications via email and SMS."""
        filing = confirmation.filing
        
        # Send email notification
        try:
            self.send_email_confirmation(confirmation)
        except Exception as e:
            logger.error(f"Error sending email confirmation: {str(e)}")
        
        # Send SMS notification if enabled
        if self.twilio_client and filing.taxpayer and filing.taxpayer.phone_number:
            try:
                self.send_sms_confirmation(confirmation)
            except Exception as e:
                logger.error(f"Error sending SMS confirmation: {str(e)}")
    
    def send_email_confirmation(self, confirmation: FilingConfirmation) -> FilingNotification:
        """Send email confirmation notification."""
        filing = confirmation.filing
        taxpayer = filing.taxpayer
        
        if not taxpayer or not taxpayer.email:
            logger.warning(f"No email address for filing {filing.id}")
            return None
        
        try:
            # Get email template and context
            template_name = 'filing_confirmed'
            context = get_confirmation_context(confirmation)
            
            # Render email content
            subject = f"Tax Filing Confirmed - {confirmation.confirmation_number}"
            html_content = render_to_string(
                'taxes/email/filing_confirmation.html',
                context
            )
            text_content = render_to_string(
                'taxes/email/filing_confirmation.txt',
                context
            )
            
            # Create email message
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[taxpayer.email]
            )
            email.attach_alternative(html_content, "text/html")
            
            # Attach PDF receipt
            email.attach(
                f'filing_receipt_{confirmation.confirmation_number}.pdf',
                confirmation.pdf_receipt,
                'application/pdf'
            )
            
            # Send email
            email.send()
            
            # Create notification record
            notification = FilingNotification.objects.create(
                confirmation=confirmation,
                notification_type=NotificationType.EMAIL,
                recipient=taxpayer.email,
                subject=subject,
                content=text_content,
                status=NotificationStatus.SENT,
                sent_at=django_timezone.now()
            )
            
            logger.info(f"Sent email confirmation to {taxpayer.email}")
            return notification
            
        except Exception as e:
            logger.error(f"Error sending email confirmation: {str(e)}")
            
            # Create failed notification record
            FilingNotification.objects.create(
                confirmation=confirmation,
                notification_type=NotificationType.EMAIL,
                recipient=taxpayer.email if taxpayer else 'unknown',
                subject=f"Tax Filing Confirmed - {confirmation.confirmation_number}",
                content='Failed to send',
                status=NotificationStatus.FAILED,
                error_message=str(e)
            )
            raise
    
    def send_sms_confirmation(self, confirmation: FilingConfirmation) -> Optional[FilingNotification]:
        """Send SMS confirmation notification."""
        if not self.twilio_client:
            logger.warning("SMS notifications not available")
            return None
        
        filing = confirmation.filing
        taxpayer = filing.taxpayer
        
        if not taxpayer or not taxpayer.phone_number:
            logger.warning(f"No phone number for filing {filing.id}")
            return None
        
        try:
            # Get SMS template
            sms_content = get_sms_template('filing_confirmed', {
                'confirmation_number': confirmation.confirmation_number,
                'filing_type': filing.get_filing_type_display(),
                'tax_year': filing.tax_year
            })
            
            # Send SMS
            message = self.twilio_client.messages.create(
                body=sms_content,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=taxpayer.phone_number
            )
            
            # Create notification record
            notification = FilingNotification.objects.create(
                confirmation=confirmation,
                notification_type=NotificationType.SMS,
                recipient=taxpayer.phone_number,
                content=sms_content,
                status=NotificationStatus.SENT,
                sent_at=django_timezone.now(),
                external_id=message.sid
            )
            
            logger.info(f"Sent SMS confirmation to {taxpayer.phone_number}")
            return notification
            
        except Exception as e:
            logger.error(f"Error sending SMS confirmation: {str(e)}")
            
            # Create failed notification record
            FilingNotification.objects.create(
                confirmation=confirmation,
                notification_type=NotificationType.SMS,
                recipient=taxpayer.phone_number if taxpayer else 'unknown',
                content=sms_content if 'sms_content' in locals() else 'Failed to generate',
                status=NotificationStatus.FAILED,
                error_message=str(e)
            )
            return None
    
    def resend_confirmation(self, confirmation: FilingConfirmation, 
                          notification_type: str = 'email') -> FilingNotification:
        """Resend confirmation notification."""
        if notification_type == 'email':
            return self.send_email_confirmation(confirmation)
        elif notification_type == 'sms':
            return self.send_sms_confirmation(confirmation)
        else:
            raise ValueError(f"Invalid notification type: {notification_type}")
    
    def check_notification_status(self, notification: FilingNotification) -> NotificationStatus:
        """Check status of a notification (for SMS with delivery receipts)."""
        if notification.notification_type != NotificationType.SMS or not notification.external_id:
            return notification.status
        
        if not self.twilio_client:
            return notification.status
        
        try:
            message = self.twilio_client.messages(notification.external_id).fetch()
            
            # Map Twilio status to our status
            status_map = {
                'delivered': NotificationStatus.DELIVERED,
                'sent': NotificationStatus.SENT,
                'failed': NotificationStatus.FAILED,
                'undelivered': NotificationStatus.FAILED,
                'queued': NotificationStatus.PENDING,
                'sending': NotificationStatus.PENDING
            }
            
            new_status = status_map.get(message.status, notification.status)
            
            if new_status != notification.status:
                notification.status = new_status
                if new_status == NotificationStatus.DELIVERED:
                    notification.delivered_at = django_timezone.now()
                elif new_status == NotificationStatus.FAILED:
                    notification.error_message = message.error_message
                notification.save()
            
            return new_status
            
        except Exception as e:
            logger.error(f"Error checking SMS status: {str(e)}")
            return notification.status
    
    def generate_state_specific_confirmation(self, filing: TaxFiling, 
                                           state_requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Generate state-specific confirmation requirements."""
        confirmation_data = {
            'base_confirmation': self.generate_confirmation(filing),
            'state_specific': {}
        }
        
        # Handle state-specific requirements
        state = filing.state
        
        if state == 'CA':
            # California specific requirements
            confirmation_data['state_specific']['ca_filing_id'] = f"CA-{filing.id}-{filing.tax_year}"
            confirmation_data['state_specific']['ftb_notice'] = (
                "Your filing has been submitted to the California Franchise Tax Board. "
                "You will receive a separate confirmation from FTB within 48 hours."
            )
        
        elif state == 'NY':
            # New York specific requirements
            confirmation_data['state_specific']['ny_filing_id'] = f"NY-{filing.id}-{filing.tax_year}"
            confirmation_data['state_specific']['dtf_notice'] = (
                "Your filing has been submitted to the New York State Department of Taxation and Finance. "
                "Check your NY DTF account for processing updates."
            )
        
        elif state == 'TX':
            # Texas specific requirements (no state income tax, but sales tax)
            if filing.filing_type == 'sales_tax':
                confirmation_data['state_specific']['tx_taxpayer_number'] = filing.taxpayer.state_tax_id
                confirmation_data['state_specific']['comptroller_notice'] = (
                    "Your sales tax filing has been submitted to the Texas Comptroller. "
                    "Your next filing deadline is calculated based on your filing frequency."
                )
        
        # Add any additional state-specific data from requirements
        if state_requirements:
            confirmation_data['state_specific'].update(state_requirements)
        
        return confirmation_data


# Convenience functions
def generate_filing_confirmation(filing_id: int) -> FilingConfirmation:
    """Generate confirmation for a filing by ID."""
    try:
        filing = TaxFiling.objects.get(id=filing_id)
        generator = ConfirmationGenerator()
        return generator.generate_confirmation(filing)
    except TaxFiling.DoesNotExist:
        logger.error(f"Filing {filing_id} not found")
        raise


def resend_filing_confirmation(confirmation_id: int, notification_type: str = 'email') -> FilingNotification:
    """Resend confirmation notification."""
    try:
        confirmation = FilingConfirmation.objects.get(id=confirmation_id)
        generator = ConfirmationGenerator()
        return generator.resend_confirmation(confirmation, notification_type)
    except FilingConfirmation.DoesNotExist:
        logger.error(f"Confirmation {confirmation_id} not found")
        raise