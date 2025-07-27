import logging
from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
import resend

logger = logging.getLogger(__name__)

# Initialize Resend
resend.api_key = settings.RESEND_API_KEY


def send_quote_email(job, email_address, quote_pdf):
    """Send job quote via email using Resend"""
    try:
        subject = f"Quote #{job.job_number} - {job.name}"
        
        # Create email body
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Quote for {job.name}</h2>
            <p>Dear {job.customer.name},</p>
            
            <p>Please find attached your quote for the following job:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Job Number:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">{job.job_number}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Description:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">{job.description}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Quote Amount:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${job.quoted_amount}</td>
                </tr>
                {f'''<tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Valid Until:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">{job.quote_valid_until}</td>
                </tr>''' if job.quote_valid_until else ''}
            </table>
            
            <p>If you have any questions or would like to proceed with this quote, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>
            {job.tenant.business_name if hasattr(job, 'tenant') else 'Your Service Team'}</p>
        </div>
        """
        
        # Send using Resend
        response = resend.Emails.send({
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": [email_address],
            "subject": subject,
            "html": html_content,
            "attachments": [
                {
                    "filename": f"quote_{job.job_number}.pdf",
                    "content": quote_pdf,
                }
            ]
        })
        
        logger.info(f"Quote email sent successfully to {email_address} for job {job.job_number}")
        return True
        
    except Exception as e:
        logger.error(f"Error sending quote email: {str(e)}")
        return False


def send_invoice_email(job, invoice, email_address, invoice_pdf):
    """Send invoice via email using Resend"""
    try:
        subject = f"Invoice #{invoice.invoice_number} - {job.name}"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Invoice for {job.name}</h2>
            <p>Dear {job.customer.name},</p>
            
            <p>Please find attached your invoice for the completed job:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Invoice Number:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">{invoice.invoice_number}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Job Number:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">{job.job_number}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total Amount:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${invoice.total_amount}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Due Date:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">{invoice.due_date}</td>
                </tr>
            </table>
            
            <p style="background-color: #f0f8ff; padding: 15px; border-radius: 5px;">
                <strong>Payment Options:</strong><br>
                You can pay this invoice online using the following link:<br>
                <a href="{settings.FRONTEND_URL}/pay/{invoice.payment_token}" style="color: #0066cc;">Pay Invoice Online</a>
            </p>
            
            <p>Thank you for your business!</p>
            
            <p>Best regards,<br>
            {job.tenant.business_name if hasattr(job, 'tenant') else 'Your Service Team'}</p>
        </div>
        """
        
        response = resend.Emails.send({
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": [email_address],
            "subject": subject,
            "html": html_content,
            "attachments": [
                {
                    "filename": f"invoice_{invoice.invoice_number}.pdf",
                    "content": invoice_pdf,
                }
            ]
        })
        
        logger.info(f"Invoice email sent successfully to {email_address}")
        return True
        
    except Exception as e:
        logger.error(f"Error sending invoice email: {str(e)}")
        return False


def send_job_completion_notification(job, email_address):
    """Send job completion notification to customer"""
    try:
        subject = f"Job Completed - {job.name}"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Job Completed</h2>
            <p>Dear {job.customer.name},</p>
            
            <p>We're pleased to inform you that your job has been completed:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Job Number:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">{job.job_number}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Description:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">{job.name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Completion Date:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">{job.completion_date}</td>
                </tr>
            </table>
            
            <p>An invoice will be sent to you shortly. If you have any questions or concerns about the completed work, please don't hesitate to contact us.</p>
            
            <p>Thank you for choosing our services!</p>
            
            <p>Best regards,<br>
            {job.tenant.business_name if hasattr(job, 'tenant') else 'Your Service Team'}</p>
        </div>
        """
        
        response = resend.Emails.send({
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": [email_address],
            "subject": subject,
            "html": html_content
        })
        
        logger.info(f"Job completion notification sent to {email_address}")
        return True
        
    except Exception as e:
        logger.error(f"Error sending job completion notification: {str(e)}")
        return False