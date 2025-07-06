"""
Resend email backend for Django
"""
import os
import requests
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import EmailMessage
from typing import List


class ResendEmailBackend(BaseEmailBackend):
    """
    Custom email backend for Resend API
    """
    
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = os.environ.get('RESEND_API_KEY', '')
        self.api_url = 'https://api.resend.com/emails'
        
    def send_messages(self, email_messages: List[EmailMessage]):
        """
        Send email messages using Resend API
        """
        if not self.api_key:
            if not self.fail_silently:
                raise ValueError("RESEND_API_KEY environment variable is not set")
            return 0
            
        num_sent = 0
        
        for message in email_messages:
            try:
                # Prepare the payload
                payload = {
                    'from': message.from_email or os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@dottapps.com'),
                    'to': message.to,
                    'subject': message.subject,
                }
                
                # Add HTML content if available
                if hasattr(message, 'alternatives'):
                    for content, mimetype in message.alternatives:
                        if mimetype == 'text/html':
                            payload['html'] = content
                            break
                
                # Add text content
                if message.body:
                    payload['text'] = message.body
                
                # Add CC and BCC if present
                if message.cc:
                    payload['cc'] = message.cc
                if message.bcc:
                    payload['bcc'] = message.bcc
                
                # Send the email
                response = requests.post(
                    self.api_url,
                    headers={
                        'Authorization': f'Bearer {self.api_key}',
                        'Content-Type': 'application/json'
                    },
                    json=payload
                )
                
                if response.status_code == 200:
                    num_sent += 1
                elif not self.fail_silently:
                    response.raise_for_status()
                    
            except Exception as e:
                if not self.fail_silently:
                    raise
                    
        return num_sent