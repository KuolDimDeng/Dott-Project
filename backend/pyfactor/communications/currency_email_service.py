"""
Currency-aware email service for invoices and quotes
Handles multi-currency display in email templates
"""
import logging
from django.conf import settings
from decimal import Decimal
from currency.currency_data import get_currency_info, format_currency
from currency.exchange_rate_service import exchange_rate_service
from communications.email_service import get_business_logo_url
import resend

logger = logging.getLogger(__name__)

# Initialize Resend
resend.api_key = settings.RESEND_API_KEY


def get_currency_preferences(business):
    """Get currency preferences for a business"""
    try:
        if hasattr(business, 'details') and business.details:
            return {
                'currency_code': business.details.preferred_currency_code or 'USD',
                'currency_name': business.details.preferred_currency_name or 'US Dollar',
                'show_usd_on_invoices': business.details.show_usd_on_invoices,
                'show_usd_on_quotes': business.details.show_usd_on_quotes,
                'show_usd_on_reports': business.details.show_usd_on_reports,
            }
    except Exception as e:
        logger.error(f"Error getting currency preferences: {str(e)}")
    
    # Default to USD
    return {
        'currency_code': 'USD',
        'currency_name': 'US Dollar',
        'show_usd_on_invoices': False,
        'show_usd_on_quotes': False,
        'show_usd_on_reports': False,
    }


def format_amount_for_email(amount, currency_preferences, context='invoice'):
    """Format amount for email display with optional USD equivalent"""
    if not amount:
        return '$0.00'
    
    amount = Decimal(str(amount))
    currency_code = currency_preferences['currency_code']
    
    # If USD, just format normally
    if currency_code == 'USD':
        return f"${amount:.2f}"
    
    # Get exchange rate for conversion
    try:
        converted_amount, metadata = exchange_rate_service.convert_amount(
            amount, 'USD', currency_code
        )
        
        if converted_amount is None:
            # Fallback to USD if conversion fails
            return f"${amount:.2f}"
        
        # Format in local currency
        local_formatted = format_currency(converted_amount, currency_code)
        
        # Check if we should show USD equivalent
        show_usd = False
        if context == 'invoice' and currency_preferences['show_usd_on_invoices']:
            show_usd = True
        elif context == 'quote' and currency_preferences['show_usd_on_quotes']:
            show_usd = True
        elif context == 'report' and currency_preferences['show_usd_on_reports']:
            show_usd = True
        
        if show_usd:
            return f"{local_formatted} (${amount:.2f} USD)"
        else:
            return local_formatted
            
    except Exception as e:
        logger.error(f"Error formatting amount for email: {str(e)}")
        return f"${amount:.2f}"


def send_currency_aware_quote_email(job, email_address, quote_pdf):
    """Send job quote via email with currency awareness"""
    try:
        subject = f"Quote #{job.job_number} - {job.name}"
        
        # Get business and currency preferences
        business = job.tenant.business if hasattr(job, 'tenant') and hasattr(job.tenant, 'business') else None
        currency_preferences = get_currency_preferences(business)
        
        # Get business logo
        logo_url = get_business_logo_url(job.tenant) if hasattr(job, 'tenant') else None
        logo_html = f'<img src="{logo_url}" alt="Business Logo" style="max-height: 60px; max-width: 200px; margin-bottom: 20px;">' if logo_url else ''
        
        # Format quote amount with currency
        quote_amount_formatted = format_amount_for_email(
            job.quoted_amount, 
            currency_preferences, 
            context='quote'
        )
        
        # Add currency context if non-USD
        currency_context = ""
        if currency_preferences['currency_code'] != 'USD':
            if currency_preferences['show_usd_on_quotes']:
                currency_context = f"""
                <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #0369a1;">
                        <strong>💡 Payment Information:</strong> If you accept this quote, payment will be processed in USD equivalent based on current exchange rates at the time of payment.
                    </p>
                </div>
                """
            else:
                currency_context = f"""
                <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #0369a1;">
                        <strong>💡 Payment Information:</strong> Amounts are displayed in {currency_preferences['currency_name']}. Payment will be processed in USD equivalent.
                    </p>
                </div>
                """
        
        # Create email body
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            {logo_html}
            <h2 style="color: #1f2937;">Quote for {job.name}</h2>
            <p>Dear {job.customer.name},</p>
            
            <p>Please find attached your quote for the following job:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9fafb;">
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Job Number:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">{job.job_number}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Description:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">{job.description}</td>
                </tr>
                <tr style="background-color: #fef3c7;">
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Quote Amount:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #1f2937; font-size: 16px;">{quote_amount_formatted}</td>
                </tr>
                {f'''<tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Valid Until:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">{job.quote_valid_until}</td>
                </tr>''' if job.quote_valid_until else ''}
            </table>
            
            {currency_context}
            
            <p>If you have any questions or would like to proceed with this quote, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>
            <strong>{job.tenant.business_name if hasattr(job, 'tenant') else 'Your Service Team'}</strong></p>
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
        
        logger.info(f"Currency-aware quote email sent successfully to {email_address} for job {job.job_number}")
        return True
        
    except Exception as e:
        logger.error(f"Error sending currency-aware quote email: {str(e)}")
        return False


def send_currency_aware_invoice_email(job, invoice, email_address, invoice_pdf):
    """Send invoice via email with currency awareness"""
    try:
        subject = f"Invoice #{invoice.invoice_number} - {job.name}"
        
        # Get business and currency preferences
        business = job.tenant.business if hasattr(job, 'tenant') and hasattr(job.tenant, 'business') else None
        currency_preferences = get_currency_preferences(business)
        
        # Get business logo
        logo_url = get_business_logo_url(job.tenant) if hasattr(job, 'tenant') else None
        logo_html = f'<img src="{logo_url}" alt="Business Logo" style="max-height: 60px; max-width: 200px; margin-bottom: 20px;">' if logo_url else ''
        
        # Format invoice amounts with currency
        subtotal_formatted = format_amount_for_email(
            invoice.subtotal, 
            currency_preferences, 
            context='invoice'
        )
        tax_formatted = format_amount_for_email(
            invoice.tax_amount, 
            currency_preferences, 
            context='invoice'
        )
        total_formatted = format_amount_for_email(
            invoice.total_amount, 
            currency_preferences, 
            context='invoice'
        )
        
        # Add currency context if non-USD
        currency_context = ""
        payment_context = ""
        if currency_preferences['currency_code'] != 'USD':
            currency_context = f"""
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #065f46;">
                    <strong>💳 Payment Processing:</strong> This invoice is displayed in {currency_preferences['currency_name']}. 
                    Payment will be processed in USD equivalent based on current exchange rates.
                </p>
            </div>
            """
            
            if currency_preferences['show_usd_on_invoices']:
                payment_context = """
                <p style="font-size: 13px; color: #6b7280; margin-top: 15px;">
                    * USD amounts shown for reference. Actual payment will be processed in USD at current exchange rates.
                </p>
                """
        
        # Create email body
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            {logo_html}
            <h2 style="color: #1f2937;">Invoice #{invoice.invoice_number}</h2>
            <p>Dear {job.customer.name},</p>
            
            <p>Please find attached your invoice for the completed work:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9fafb;">
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Job Number:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">{job.job_number}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Invoice Number:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">{invoice.invoice_number}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Description:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">{job.description}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Subtotal:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">{subtotal_formatted}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Tax:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">{tax_formatted}</td>
                </tr>
                <tr style="background-color: #fee2e2;">
                    <td style="padding: 12px; font-weight: bold; color: #374151; font-size: 16px;">Total Amount:</td>
                    <td style="padding: 12px; font-weight: bold; color: #1f2937; font-size: 16px;">{total_formatted}</td>
                </tr>
            </table>
            
            {currency_context}
            {payment_context}
            
            <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
                <h3 style="color: #1f2937; margin-top: 0;">Payment Instructions</h3>
                <p style="margin: 5px 0;">Due Date: <strong>{invoice.due_date}</strong></p>
                <p style="margin: 5px 0;">Payment methods accepted: Credit Card, Bank Transfer</p>
                <p style="margin-bottom: 0;">Please reference Invoice #{invoice.invoice_number} with your payment.</p>
            </div>
            
            <p>If you have any questions about this invoice, please contact us immediately.</p>
            
            <p>Thank you for your business!</p>
            
            <p>Best regards,<br>
            <strong>{job.tenant.business_name if hasattr(job, 'tenant') else 'Your Service Team'}</strong></p>
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
                    "filename": f"invoice_{invoice.invoice_number}.pdf",
                    "content": invoice_pdf,
                }
            ]
        })
        
        logger.info(f"Currency-aware invoice email sent successfully to {email_address} for invoice {invoice.invoice_number}")
        return True
        
    except Exception as e:
        logger.error(f"Error sending currency-aware invoice email: {str(e)}")
        return False


def send_currency_aware_payment_confirmation_email(invoice, payment_details, email_address):
    """Send payment confirmation email with currency information"""
    try:
        subject = f"Payment Confirmation - Invoice #{invoice.invoice_number}"
        
        # Get business and currency preferences
        business = invoice.job.tenant.business if hasattr(invoice, 'job') and hasattr(invoice.job, 'tenant') and hasattr(invoice.job.tenant, 'business') else None
        currency_preferences = get_currency_preferences(business)
        
        # Get business logo
        logo_url = get_business_logo_url(invoice.job.tenant) if hasattr(invoice, 'job') and hasattr(invoice.job, 'tenant') else None
        logo_html = f'<img src="{logo_url}" alt="Business Logo" style="max-height: 60px; max-width: 200px; margin-bottom: 20px;">' if logo_url else ''
        
        # Format amounts
        invoice_amount_formatted = format_amount_for_email(
            invoice.total_amount, 
            currency_preferences, 
            context='invoice'
        )
        
        usd_amount = payment_details.get('amount_charged_usd', invoice.total_amount)
        exchange_rate = payment_details.get('exchange_rate_used')
        
        # Create currency conversion section
        currency_conversion = ""
        if currency_preferences['currency_code'] != 'USD' and exchange_rate:
            currency_conversion = f"""
            <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="color: #0369a1; margin-top: 0;">Currency Conversion Details</h4>
                <p style="margin: 5px 0;"><strong>Invoice Amount:</strong> {invoice_amount_formatted}</p>
                <p style="margin: 5px 0;"><strong>Amount Charged:</strong> ${usd_amount:.2f} USD</p>
                <p style="margin: 5px 0;"><strong>Exchange Rate:</strong> 1 USD = {exchange_rate} {currency_preferences['currency_code']}</p>
                <p style="margin-bottom: 0; font-size: 13px; color: #0369a1;">Exchange rate applied at time of payment.</p>
            </div>
            """
        
        # Create email body
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            {logo_html}
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #059669; margin-bottom: 10px;">✅ Payment Confirmed</h2>
                <p style="color: #6b7280; margin: 0;">Thank you for your payment!</p>
            </div>
            
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #065f46; margin-top: 0;">Payment Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #374151;"><strong>Invoice Number:</strong></td>
                        <td style="padding: 8px 0; color: #1f2937;">{invoice.invoice_number}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #374151;"><strong>Payment Date:</strong></td>
                        <td style="padding: 8px 0; color: #1f2937;">{payment_details.get('payment_date', 'Today')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #374151;"><strong>Amount Paid:</strong></td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">${usd_amount:.2f} USD</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #374151;"><strong>Payment Method:</strong></td>
                        <td style="padding: 8px 0; color: #1f2937;">{payment_details.get('payment_method', 'Credit Card')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #374151;"><strong>Transaction ID:</strong></td>
                        <td style="padding: 8px 0; color: #1f2937; font-family: monospace; font-size: 12px;">{payment_details.get('transaction_id', 'N/A')}</td>
                    </tr>
                </table>
            </div>
            
            {currency_conversion}
            
            <p>Your payment has been successfully processed and your invoice is now marked as paid.</p>
            
            <p>If you need a receipt or have any questions about this payment, please contact us with the transaction ID above.</p>
            
            <p>Thank you for your business!</p>
            
            <p>Best regards,<br>
            <strong>{invoice.job.tenant.business_name if hasattr(invoice, 'job') and hasattr(invoice.job, 'tenant') else 'Your Service Team'}</strong></p>
        </div>
        """
        
        # Send using Resend
        response = resend.Emails.send({
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": [email_address],
            "subject": subject,
            "html": html_content,
        })
        
        logger.info(f"Currency-aware payment confirmation email sent successfully to {email_address}")
        return True
        
    except Exception as e:
        logger.error(f"Error sending currency-aware payment confirmation email: {str(e)}")
        return False