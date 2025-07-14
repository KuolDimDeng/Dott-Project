import os
import requests
import logging

logger = logging.getLogger(__name__)

def register_whatsapp_number():
    """
    Register WhatsApp Business Account with Cloud API
    This needs to be run once before sending messages
    """
    access_token = os.environ.get('WHATSAPP_ACCESS_TOKEN')
    phone_number_id = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '676188225586230')
    
    if not access_token:
        logger.error("WHATSAPP_ACCESS_TOKEN not set")
        return False
    
    # First, get the WhatsApp Business Account ID
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}"
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    try:
        # Get phone number details
        response = requests.get(url, headers=headers)
        logger.info(f"Phone number details response: {response.status_code}")
        logger.info(f"Response: {response.text}")
        
        if response.ok:
            data = response.json()
            waba_id = data.get('whatsapp_business_account', {}).get('id')
            logger.info(f"WhatsApp Business Account ID: {waba_id}")
            
            # Register the phone number
            register_url = f"https://graph.facebook.com/v18.0/{phone_number_id}/register"
            register_data = {
                "messaging_product": "whatsapp",
                "pin": "123456"  # Use a 6-digit PIN for test numbers
            }
            
            register_response = requests.post(register_url, json=register_data, headers=headers)
            logger.info(f"Registration response: {register_response.status_code}")
            logger.info(f"Registration result: {register_response.text}")
            
            return register_response.ok
        else:
            logger.error(f"Failed to get phone number details: {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return False

if __name__ == "__main__":
    # Run this script to register the WhatsApp number
    logging.basicConfig(level=logging.INFO)
    success = register_whatsapp_number()
    print(f"Registration {'successful' if success else 'failed'}")