"""
WhatsApp Receipt Views
Handles sending receipts via WhatsApp Business API
"""

import logging
import json
import requests
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)

WHATSAPP_API_URL = "https://graph.facebook.com/v17.0"
WHATSAPP_PHONE_NUMBER_ID = settings.WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_ACCESS_TOKEN = settings.WHATSAPP_ACCESS_TOKEN

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_receipt_via_whatsapp(request):
    """
    Send receipt via WhatsApp Business API
    """
    try:
        phone_number = request.data.get('phone_number')
        receipt_data = request.data.get('receipt_data')
        format_type = request.data.get('format', 'text')
        
        if not phone_number or not receipt_data:
            return Response(
                {"error": "Phone number and receipt data are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Clean phone number (remove spaces, dashes, etc.)
        clean_phone = ''.join(filter(str.isdigit, phone_number))
        if not clean_phone.startswith('+'):
            # Add country code if missing (default to US +1)
            # You might want to get this from user's business country
            clean_phone = f"+1{clean_phone}"
        
        logger.info(f"[WhatsApp Receipt] Sending to: {clean_phone}")
        
        # Format receipt message
        message_text = format_receipt_message(receipt_data)
        
        # Prepare WhatsApp API request
        url = f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        
        # Create message payload
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "text",
            "text": {
                "body": message_text
            }
        }
        
        # Send message via WhatsApp API
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"[WhatsApp Receipt] Sent successfully: {result}")
            
            return Response({
                "success": True,
                "message_id": result.get("messages", [{}])[0].get("id"),
                "phone_number": clean_phone
            })
        else:
            logger.error(f"[WhatsApp Receipt] Failed: {response.text}")
            return Response(
                {"error": "Failed to send WhatsApp message", "details": response.text},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        logger.error(f"[WhatsApp Receipt] Error: {str(e)}")
        return Response(
            {"error": "Failed to send WhatsApp receipt"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def format_receipt_message(receipt_data):
    """
    Format receipt data into WhatsApp message text
    """
    business = receipt_data.get('business', {})
    receipt = receipt_data.get('receipt', {})
    items = receipt_data.get('items', [])
    totals = receipt_data.get('totals', {})
    customer = receipt_data.get('customer', {})
    payment = receipt_data.get('payment', {})
    
    # Build message
    message = f"🧾 *{business.get('name', 'Receipt')}*\n"
    message += f"Receipt #{receipt.get('number', 'N/A')}\n"
    message += f"{receipt.get('date', '')}\n"
    message += "─────────────────\n\n"
    
    # Customer info
    if customer:
        customer_name = customer.get('name') or customer.get('company_name', 'Walk-In')
        message += f"*Customer:* {customer_name}\n\n"
    
    # Items
    message += "*Items:*\n"
    for item in items:
        name = item.get('name', 'Item')
        qty = item.get('quantity', 1)
        price = item.get('price', 0)
        total = item.get('total', qty * price)
        message += f"• {name}\n"
        message += f"  {qty} × ${price:.2f} = *${total:.2f}*\n"
    
    message += "\n─────────────────\n"
    
    # Totals
    subtotal = totals.get('subtotal', 0)
    tax = totals.get('tax', 0)
    discount = totals.get('discount', 0)
    total = totals.get('total', 0)
    
    message += f"Subtotal: ${subtotal:.2f}\n"
    
    if discount > 0:
        message += f"Discount: -${discount:.2f}\n"
    
    if tax > 0:
        tax_rate = totals.get('taxRate', 0)
        message += f"Tax ({tax_rate}%): ${tax:.2f}\n"
    
    message += f"*TOTAL: ${total:.2f}*\n\n"
    
    # Payment info
    payment_method = payment.get('method', 'cash')
    if payment_method == 'card':
        message += "💳 Paid by Credit Card\n"
    elif payment_method == 'cash':
        message += "💵 Paid by Cash\n"
    else:
        message += f"Paid by {payment_method}\n"
    
    if payment.get('reference'):
        message += f"Ref: {payment['reference']}\n"
    
    message += "\n─────────────────\n"
    message += "Thank you for your business! 🙏\n"
    message += f"\n_Powered by Dott POS_"
    
    return message