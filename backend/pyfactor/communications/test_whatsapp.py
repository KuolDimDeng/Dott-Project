import os
import requests
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_hello_world_template():
    """Test WhatsApp with hello_world template"""
    
    # Use your environment variables
    access_token = "EAAPMAZBHELoEBPDQMgXQQXzrkNB7vIzUqQGZAe0s9Q4NIAYkOGKysoE7F7kUBzjBLsuTdoM5le7rL7zWmbFzBjGSngqi2vUDOykfvYAAteTKwl8wdZAuzmU1pr3iJNwY9QghkTFPkQheDZATvnS97i0JqAljY4OwUklUO66gZBwL2sISqhjeEg7BPTxVBfCc500Qz0HmmC2f7BF6D202uYKsQPS58toRHIUGMCVv7"
    phone_number_id = "676188225586230"
    
    # Your phone number for testing (replace with your actual number)
    test_to_number = "13855007716"  # Remove the + for API
    
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # Try hello_world template first (this is pre-approved)
    template_data = {
        'messaging_product': 'whatsapp',
        'to': test_to_number,
        'type': 'template',
        'template': {
            'name': 'hello_world',
            'language': {
                'code': 'en_US'
            }
        }
    }
    
    logger.info(f"Testing hello_world template to {test_to_number}")
    logger.info(f"URL: {url}")
    logger.info(f"Data: {template_data}")
    
    try:
        response = requests.post(url, json=template_data, headers=headers)
        logger.info(f"Response status: {response.status_code}")
        logger.info(f"Response: {response.text}")
        
        if response.ok:
            result = response.json()
            message_id = result.get('messages', [{}])[0].get('id')
            logger.info(f"✅ Success! Message ID: {message_id}")
            return True
        else:
            logger.error(f"❌ Failed: {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    test_hello_world_template()