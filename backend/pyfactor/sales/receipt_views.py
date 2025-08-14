"""
Receipt email sending views for POS system.
Handles secure server-side email delivery using Resend API.
"""

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import logging
import requests

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_receipt_email(request):
    """
    Send receipt via email using Resend API.
    This is the secure backend endpoint that keeps API keys hidden.
    Uses direct HTTP requests to Resend API for maximum compatibility.
    """
    try:
        # Extract data from request
        email_to = request.data.get('to')
        receipt_data = request.data.get('receipt')
        
        if not email_to or not receipt_data:
            return Response(
                {'error': 'Missing required fields: to and receipt'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if Resend API key is configured
        resend_api_key = getattr(settings, 'RESEND_API_KEY', None)
        if not resend_api_key:
            logger.error('RESEND_API_KEY not configured in settings')
            return Response(
                {
                    'error': 'Email service not configured',
                    'message': 'Email service is not properly configured. Please contact support.',
                    'details': 'RESEND_API_KEY missing'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Generate email content
        receipt_number = receipt_data.get('receipt', {}).get('number', 'Unknown')
        business_name = receipt_data.get('business', {}).get('name', 'Business')
        
        # Create HTML email from receipt data
        html_content = generate_receipt_html(receipt_data)
        text_content = generate_receipt_text(receipt_data)
        
        # Send email using Resend API via HTTP request
        logger.info(f"Sending receipt email to {email_to} using Resend API")
        
        try:
            # Use requests library to call Resend API directly
            response = requests.post(
                'https://api.resend.com/emails',
                headers={
                    'Authorization': f'Bearer {resend_api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    "from": "Dott POS <noreply@dottapps.com>",
                    "to": [email_to],
                    "subject": f"Receipt #{receipt_number} - {business_name}",
                    "html": html_content,
                    "text": text_content
                },
                timeout=10
            )
            
            if response.status_code == 200:
                response_data = response.json()
                logger.info(f"Receipt email sent successfully to {email_to}, message ID: {response_data.get('id')}")
                
                return Response({
                    'success': True,
                    'message': 'Receipt sent to email',
                    'details': {
                        'type': 'email',
                        'recipient': email_to,
                        'receiptNumber': receipt_number,
                        'messageId': response_data.get('id')
                    }
                }, status=status.HTTP_200_OK)
            else:
                error_msg = response.text
                logger.error(f"Resend API error: {response.status_code} - {error_msg}")
                return Response(
                    {
                        'error': 'Failed to send email',
                        'message': 'Email service returned an error',
                        'details': error_msg
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except requests.exceptions.Timeout:
            logger.error('Resend API timeout')
            return Response(
                {'error': 'Email service timeout', 'message': 'The email service took too long to respond'},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )
        except requests.exceptions.RequestException as e:
            logger.error(f'Resend API request error: {e}')
            return Response(
                {'error': 'Email service error', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    except Exception as e:
        logger.error(f"Unexpected error sending receipt email: {str(e)}")
        return Response(
            {'error': 'Failed to send email receipt', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def generate_receipt_html(receipt_data):
    """Generate HTML content for receipt email."""
    business = receipt_data.get('business', {})
    items = receipt_data.get('items', [])
    totals = receipt_data.get('totals', {})
    payment = receipt_data.get('payment', {})
    receipt_info = receipt_data.get('receipt', {})
    # Get currency information from receipt data
    currency_symbol = receipt_data.get('currencySymbol', '$')
    currency_code = receipt_data.get('currency', 'USD')
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 20px; }}
            .business-name {{ font-size: 24px; font-weight: bold; color: #1e40af; }}
            .items-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            .items-table th {{ background-color: #1e40af; color: white; padding: 10px; text-align: left; }}
            .items-table td {{ border-bottom: 1px solid #e5e7eb; padding: 8px; }}
            .totals {{ margin-top: 20px; }}
            .total-row {{ display: flex; justify-content: space-between; padding: 5px 0; }}
            .grand-total {{ font-size: 20px; font-weight: bold; color: #1e40af; border-top: 2px solid #1e40af; padding-top: 10px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                {f"<div class='business-name'>{business.get('name')}</div>" if business.get('name') else ""}
                <div>Receipt #{receipt_info.get('number', 'N/A')}</div>
                <div>{receipt_info.get('date', '')} {receipt_info.get('time', '')}</div>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    for item in items:
        # Ensure numeric values for calculations
        item_price = float(item.get('price', item.get('unit_price', 0)))
        quantity = int(float(item.get('quantity', 1)))
        item_total = float(item.get('total', item_price * quantity))
        html += f"""
                    <tr>
                        <td>{item.get('name', 'Item')}</td>
                        <td>{quantity}</td>
                        <td>{currency_symbol}{item_price:.2f}</td>
                        <td>{currency_symbol}{item_total:.2f}</td>
                    </tr>
        """
    
    html += f"""
                </tbody>
            </table>
            
            <div class="totals">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>{currency_symbol}{totals.get('subtotal', 0)}</span>
                </div>
    """
    
    if float(totals.get('tax', 0)) > 0:
        html += f"""
                <div class="total-row">
                    <span>Tax:</span>
                    <span>{currency_symbol}{totals.get('tax', 0)}</span>
                </div>
        """
    
    html += f"""
                <div class="total-row grand-total">
                    <span>Total:</span>
                    <span>{currency_symbol}{totals.get('total', 0)}</span>
                </div>
            </div>
            
            <p>Payment Method: {payment.get('method', 'N/A').replace('_', ' ').title()}</p>
            """
    
    # Add cash payment details if applicable
    if payment.get('method') == 'cash' and payment.get('amountTendered'):
        html += f"""
            <p>Amount Tendered: {currency_symbol}{payment.get('amountTendered', 0)}</p>
        """
        if float(payment.get('changeDue', 0)) > 0:
            html += f"""
            <p>Change Due: {currency_symbol}{payment.get('changeDue', 0)}</p>
            """
    
    html += """
            <p>Thank you for your business!</p>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="font-size: 11px; color: #6b7280; margin: 0;">
                    Powered by <a href="https://dottapps.com" style="color: #1e40af; text-decoration: none;">Dott</a>
                </p>
                <p style="font-size: 10px; color: #9ca3af; margin-top: 5px;">
                    <a href="https://dottapps.com" style="color: #9ca3af; text-decoration: none;">dottapps.com</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html


def generate_receipt_text(receipt_data):
    """Generate plain text content for receipt email."""
    business = receipt_data.get('business', {})
    items = receipt_data.get('items', [])
    totals = receipt_data.get('totals', {})
    payment = receipt_data.get('payment', {})
    receipt_info = receipt_data.get('receipt', {})
    # Get currency information from receipt data
    currency_symbol = receipt_data.get('currencySymbol', '$')
    currency_code = receipt_data.get('currency', 'USD')
    
    # Only add business name if it exists
    text = ""
    if business.get('name'):
        text = f"{business.get('name')}\n"
    text += f"Receipt #{receipt_info.get('number', 'N/A')}\n"
    text += f"{receipt_info.get('date', '')} {receipt_info.get('time', '')}\n"
    text += "=" * 40 + "\n\n"
    
    text += "Items:\n"
    for item in items:
        # Ensure numeric values for calculations
        item_price = float(item.get('price', item.get('unit_price', 0)))
        quantity = int(float(item.get('quantity', 1)))
        item_total = float(item.get('total', item_price * quantity))
        text += f"- {item.get('name', 'Item')} x{quantity} = {currency_symbol}{item_total:.2f}\n"
    
    text += "\n" + "=" * 40 + "\n"
    text += f"Subtotal: {currency_symbol}{totals.get('subtotal', 0)}\n"
    
    if float(totals.get('tax', 0)) > 0:
        text += f"Tax: {currency_symbol}{totals.get('tax', 0)}\n"
    
    text += f"TOTAL: {currency_symbol}{totals.get('total', 0)}\n"
    text += f"\nPayment: {payment.get('method', 'N/A').replace('_', ' ').title()}\n"
    
    # Add cash payment details if applicable
    if payment.get('method') == 'cash' and payment.get('amountTendered'):
        text += f"Amount Tendered: {currency_symbol}{payment.get('amountTendered', 0)}\n"
        if float(payment.get('changeDue', 0)) > 0:
            text += f"Change Due: {currency_symbol}{payment.get('changeDue', 0)}\n"
    
    text += "\nThank you for your business!"
    text += "\n\n" + "-" * 40
    text += "\nPowered by Dott - dottapps.com"
    
    return text