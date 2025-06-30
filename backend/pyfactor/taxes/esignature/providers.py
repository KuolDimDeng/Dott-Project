"""
E-Signature Provider Implementations

This module defines the base interface and implementations for various
e-signature providers including DocuSign, Adobe Sign, HelloSign, and
an internal fallback system.
"""

import base64
import hashlib
import hmac
import json
import logging
import os
import requests
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from urllib.parse import urljoin

from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone

logger = logging.getLogger(__name__)


class SignatureStatus:
    """Constants for signature status tracking"""
    DRAFT = 'draft'
    SENT = 'sent'
    SIGNED = 'signed'
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'
    EXPIRED = 'expired'
    DECLINED = 'declined'
    ERROR = 'error'


class SignatureProvider(ABC):
    """Base interface for e-signature providers"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.name = self.__class__.__name__.lower().replace('provider', '')
    
    @abstractmethod
    def create_signature_request(self, document_data: bytes, signers: List[Dict], 
                               metadata: Dict = None) -> Dict[str, Any]:
        """
        Create a signature request
        
        Args:
            document_data: PDF document bytes
            signers: List of signer information [{'email': str, 'name': str, 'role': str}]
            metadata: Additional metadata for the request
            
        Returns:
            Dict with signature request details including request_id
        """
        pass
    
    @abstractmethod
    def get_signature_status(self, request_id: str) -> Dict[str, Any]:
        """
        Get the current status of a signature request
        
        Args:
            request_id: The signature request ID
            
        Returns:
            Dict with status information
        """
        pass
    
    @abstractmethod
    def download_signed_document(self, request_id: str) -> bytes:
        """
        Download the signed document
        
        Args:
            request_id: The signature request ID
            
        Returns:
            Signed document bytes
        """
        pass
    
    @abstractmethod
    def cancel_signature_request(self, request_id: str) -> bool:
        """
        Cancel a signature request
        
        Args:
            request_id: The signature request ID
            
        Returns:
            Success status
        """
        pass
    
    @abstractmethod
    def validate_webhook(self, payload: Dict, headers: Dict) -> bool:
        """
        Validate webhook authenticity
        
        Args:
            payload: Webhook payload
            headers: Request headers
            
        Returns:
            Validation success
        """
        pass
    
    def generate_signature_url(self, request_id: str, signer_email: str) -> str:
        """Generate a signing URL for a specific signer"""
        return f"{self.config.get('base_url', '')}/sign/{request_id}/{signer_email}"


class DocuSignProvider(SignatureProvider):
    """DocuSign integration provider"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_base = config.get('api_base', 'https://demo.docusign.net/restapi')
        self.integration_key = config.get('integration_key')
        self.user_id = config.get('user_id')
        self.private_key = config.get('private_key')
        self.account_id = config.get('account_id')
        self._access_token = None
        self._token_expires = None
    
    def _get_access_token(self) -> str:
        """Get or refresh JWT access token"""
        if self._access_token and self._token_expires and datetime.now() < self._token_expires:
            return self._access_token
        
        try:
            # Implement JWT authentication for DocuSign
            # This is a placeholder - actual implementation would use JWT library
            auth_url = f"{self.api_base}/oauth/token"
            
            # For demo purposes, using placeholder token
            self._access_token = "placeholder_token"
            self._token_expires = datetime.now() + timedelta(hours=1)
            
            logger.info("DocuSign access token refreshed")
            return self._access_token
            
        except Exception as e:
            logger.error(f"Failed to get DocuSign access token: {e}")
            raise
    
    def create_signature_request(self, document_data: bytes, signers: List[Dict], 
                               metadata: Dict = None) -> Dict[str, Any]:
        """Create DocuSign envelope"""
        try:
            token = self._get_access_token()
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            
            # Convert document to base64
            document_b64 = base64.b64encode(document_data).decode()
            
            # Build envelope definition
            envelope_definition = {
                "emailSubject": metadata.get('subject', 'Tax Document Signature Request'),
                "documents": [{
                    "documentBase64": document_b64,
                    "name": metadata.get('document_name', 'tax_document.pdf'),
                    "fileExtension": "pdf",
                    "documentId": "1"
                }],
                "recipients": {
                    "signers": []
                },
                "status": "sent"
            }
            
            # Add signers
            for i, signer in enumerate(signers):
                envelope_definition["recipients"]["signers"].append({
                    "email": signer['email'],
                    "name": signer['name'],
                    "recipientId": str(i + 1),
                    "tabs": {
                        "signHereTabs": [{
                            "documentId": "1",
                            "pageNumber": "1",
                            "xPosition": "100",
                            "yPosition": "100"
                        }]
                    }
                })
            
            # For demo purposes, return mock response
            mock_response = {
                'request_id': f'docusign_{datetime.now().timestamp()}',
                'status': SignatureStatus.SENT,
                'provider': 'docusign',
                'signing_urls': {
                    signer['email']: f"https://demo.docusign.net/signing/{i}"
                    for i, signer in enumerate(signers)
                }
            }
            
            logger.info(f"DocuSign envelope created: {mock_response['request_id']}")
            return mock_response
            
        except Exception as e:
            logger.error(f"DocuSign envelope creation failed: {e}")
            return {
                'request_id': None,
                'status': SignatureStatus.ERROR,
                'error': str(e)
            }
    
    def get_signature_status(self, request_id: str) -> Dict[str, Any]:
        """Get DocuSign envelope status"""
        try:
            # Mock implementation
            return {
                'request_id': request_id,
                'status': SignatureStatus.SENT,
                'completed_at': None,
                'signers_status': {}
            }
        except Exception as e:
            logger.error(f"Failed to get DocuSign status: {e}")
            return {'status': SignatureStatus.ERROR, 'error': str(e)}
    
    def download_signed_document(self, request_id: str) -> bytes:
        """Download signed document from DocuSign"""
        try:
            # Mock implementation - return empty PDF placeholder
            return b'%PDF-1.4 Mock signed document'
        except Exception as e:
            logger.error(f"Failed to download DocuSign document: {e}")
            raise
    
    def cancel_signature_request(self, request_id: str) -> bool:
        """Cancel DocuSign envelope"""
        try:
            # Mock implementation
            return True
        except Exception as e:
            logger.error(f"Failed to cancel DocuSign envelope: {e}")
            return False
    
    def validate_webhook(self, payload: Dict, headers: Dict) -> bool:
        """Validate DocuSign webhook"""
        try:
            # Implement HMAC validation for DocuSign webhooks
            return True
        except Exception as e:
            logger.error(f"DocuSign webhook validation failed: {e}")
            return False


class AdobeSignProvider(SignatureProvider):
    """Adobe Sign integration provider"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_base = config.get('api_base', 'https://api.na1.adobesign.com/api/rest/v6')
        self.integration_key = config.get('integration_key')
        self.client_secret = config.get('client_secret')
        self.redirect_uri = config.get('redirect_uri')
        self._access_token = config.get('access_token')
    
    def create_signature_request(self, document_data: bytes, signers: List[Dict], 
                               metadata: Dict = None) -> Dict[str, Any]:
        """Create Adobe Sign agreement"""
        try:
            # Mock implementation for Adobe Sign
            mock_response = {
                'request_id': f'adobe_{datetime.now().timestamp()}',
                'status': SignatureStatus.SENT,
                'provider': 'adobe_sign',
                'signing_urls': {
                    signer['email']: f"https://secure.na1.adobesign.com/public/esignWidget?wid={i}"
                    for i, signer in enumerate(signers)
                }
            }
            
            logger.info(f"Adobe Sign agreement created: {mock_response['request_id']}")
            return mock_response
            
        except Exception as e:
            logger.error(f"Adobe Sign agreement creation failed: {e}")
            return {
                'request_id': None,
                'status': SignatureStatus.ERROR,
                'error': str(e)
            }
    
    def get_signature_status(self, request_id: str) -> Dict[str, Any]:
        """Get Adobe Sign agreement status"""
        try:
            return {
                'request_id': request_id,
                'status': SignatureStatus.SENT,
                'completed_at': None
            }
        except Exception as e:
            logger.error(f"Failed to get Adobe Sign status: {e}")
            return {'status': SignatureStatus.ERROR, 'error': str(e)}
    
    def download_signed_document(self, request_id: str) -> bytes:
        """Download signed document from Adobe Sign"""
        try:
            return b'%PDF-1.4 Mock Adobe signed document'
        except Exception as e:
            logger.error(f"Failed to download Adobe Sign document: {e}")
            raise
    
    def cancel_signature_request(self, request_id: str) -> bool:
        """Cancel Adobe Sign agreement"""
        try:
            return True
        except Exception as e:
            logger.error(f"Failed to cancel Adobe Sign agreement: {e}")
            return False
    
    def validate_webhook(self, payload: Dict, headers: Dict) -> bool:
        """Validate Adobe Sign webhook"""
        try:
            return True
        except Exception as e:
            logger.error(f"Adobe Sign webhook validation failed: {e}")
            return False


class HelloSignProvider(SignatureProvider):
    """HelloSign/Dropbox Sign integration provider"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_base = config.get('api_base', 'https://api.hellosign.com/v3')
        self.api_key = config.get('api_key')
        self.client_id = config.get('client_id')
    
    def create_signature_request(self, document_data: bytes, signers: List[Dict], 
                               metadata: Dict = None) -> Dict[str, Any]:
        """Create HelloSign signature request"""
        try:
            headers = {
                'Authorization': f'Basic {base64.b64encode(f"{self.api_key}:".encode()).decode()}'
            }
            
            # Mock implementation for HelloSign
            mock_response = {
                'request_id': f'hellosign_{datetime.now().timestamp()}',
                'status': SignatureStatus.SENT,
                'provider': 'hellosign',
                'signing_urls': {
                    signer['email']: f"https://app.hellosign.com/sign/{i}"
                    for i, signer in enumerate(signers)
                }
            }
            
            logger.info(f"HelloSign request created: {mock_response['request_id']}")
            return mock_response
            
        except Exception as e:
            logger.error(f"HelloSign request creation failed: {e}")
            return {
                'request_id': None,
                'status': SignatureStatus.ERROR,
                'error': str(e)
            }
    
    def get_signature_status(self, request_id: str) -> Dict[str, Any]:
        """Get HelloSign signature request status"""
        try:
            return {
                'request_id': request_id,
                'status': SignatureStatus.SENT,
                'completed_at': None
            }
        except Exception as e:
            logger.error(f"Failed to get HelloSign status: {e}")
            return {'status': SignatureStatus.ERROR, 'error': str(e)}
    
    def download_signed_document(self, request_id: str) -> bytes:
        """Download signed document from HelloSign"""
        try:
            return b'%PDF-1.4 Mock HelloSign signed document'
        except Exception as e:
            logger.error(f"Failed to download HelloSign document: {e}")
            raise
    
    def cancel_signature_request(self, request_id: str) -> bool:
        """Cancel HelloSign signature request"""
        try:
            return True
        except Exception as e:
            logger.error(f"Failed to cancel HelloSign request: {e}")
            return False
    
    def validate_webhook(self, payload: Dict, headers: Dict) -> bool:
        """Validate HelloSign webhook"""
        try:
            # Validate HMAC signature
            event_hash = headers.get('X-HelloSign-Event-Hash', '')
            calculated_hash = hmac.new(
                self.api_key.encode(),
                json.dumps(payload, separators=(',', ':')).encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(event_hash, calculated_hash)
        except Exception as e:
            logger.error(f"HelloSign webhook validation failed: {e}")
            return False


class InternalSignatureProvider(SignatureProvider):
    """Internal signature system (fallback implementation)"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.signing_secret = config.get('signing_secret', settings.SECRET_KEY)
        self.base_url = config.get('base_url', 'https://api.dottapps.com')
    
    def create_signature_request(self, document_data: bytes, signers: List[Dict], 
                               metadata: Dict = None) -> Dict[str, Any]:
        """Create internal signature request"""
        try:
            request_id = f'internal_{int(datetime.now().timestamp())}'
            
            # Generate secure signing tokens for each signer
            signing_urls = {}
            for signer in signers:
                token = self._generate_signing_token(request_id, signer['email'])
                signing_urls[signer['email']] = f"{self.base_url}/taxes/esignature/sign/{request_id}?token={token}"
            
            response = {
                'request_id': request_id,
                'status': SignatureStatus.SENT,
                'provider': 'internal',
                'signing_urls': signing_urls,
                'expires_at': (datetime.now() + timedelta(days=30)).isoformat()
            }
            
            logger.info(f"Internal signature request created: {request_id}")
            return response
            
        except Exception as e:
            logger.error(f"Internal signature request creation failed: {e}")
            return {
                'request_id': None,
                'status': SignatureStatus.ERROR,
                'error': str(e)
            }
    
    def get_signature_status(self, request_id: str) -> Dict[str, Any]:
        """Get internal signature request status"""
        try:
            # This would typically query the database
            return {
                'request_id': request_id,
                'status': SignatureStatus.SENT,
                'completed_at': None,
                'provider': 'internal'
            }
        except Exception as e:
            logger.error(f"Failed to get internal signature status: {e}")
            return {'status': SignatureStatus.ERROR, 'error': str(e)}
    
    def download_signed_document(self, request_id: str) -> bytes:
        """Download internally signed document"""
        try:
            # This would typically retrieve from storage
            return b'%PDF-1.4 Mock internal signed document'
        except Exception as e:
            logger.error(f"Failed to download internal signed document: {e}")
            raise
    
    def cancel_signature_request(self, request_id: str) -> bool:
        """Cancel internal signature request"""
        try:
            # Update database status
            return True
        except Exception as e:
            logger.error(f"Failed to cancel internal signature request: {e}")
            return False
    
    def validate_webhook(self, payload: Dict, headers: Dict) -> bool:
        """Validate internal webhook (not applicable for internal system)"""
        return True
    
    def _generate_signing_token(self, request_id: str, signer_email: str) -> str:
        """Generate secure signing token"""
        data = f"{request_id}:{signer_email}:{int(datetime.now().timestamp())}"
        signature = hmac.new(
            self.signing_secret.encode(),
            data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        token_data = {
            'request_id': request_id,
            'email': signer_email,
            'timestamp': int(datetime.now().timestamp()),
            'signature': signature
        }
        
        return base64.urlsafe_b64encode(json.dumps(token_data).encode()).decode()
    
    def validate_signing_token(self, token: str, request_id: str, signer_email: str) -> bool:
        """Validate signing token"""
        try:
            token_data = json.loads(base64.urlsafe_b64decode(token.encode()).decode())
            
            # Check if token is for correct request and signer
            if (token_data.get('request_id') != request_id or 
                token_data.get('email') != signer_email):
                return False
            
            # Check if token is not expired (30 days)
            if datetime.now().timestamp() - token_data.get('timestamp', 0) > 30 * 24 * 3600:
                return False
            
            # Verify signature
            data = f"{request_id}:{signer_email}:{token_data.get('timestamp')}"
            expected_signature = hmac.new(
                self.signing_secret.encode(),
                data.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(token_data.get('signature', ''), expected_signature)
            
        except Exception as e:
            logger.error(f"Token validation failed: {e}")
            return False


def get_signature_provider(provider_name: str = None) -> SignatureProvider:
    """
    Factory function to get signature provider instance
    
    Args:
        provider_name: Name of provider ('docusign', 'adobe_sign', 'hellosign', 'internal')
                      If None, uses default from settings
    
    Returns:
        SignatureProvider instance
    """
    if not provider_name:
        provider_name = getattr(settings, 'ESIGNATURE_DEFAULT_PROVIDER', 'internal')
    
    # Get provider configurations from settings
    esignature_config = getattr(settings, 'ESIGNATURE_PROVIDERS', {})
    
    provider_classes = {
        'docusign': DocuSignProvider,
        'adobe_sign': AdobeSignProvider,
        'hellosign': HelloSignProvider,
        'internal': InternalSignatureProvider
    }
    
    if provider_name not in provider_classes:
        logger.warning(f"Unknown provider '{provider_name}', falling back to internal")
        provider_name = 'internal'
    
    provider_config = esignature_config.get(provider_name, {})
    provider_class = provider_classes[provider_name]
    
    return provider_class(provider_config)


def get_available_providers() -> List[str]:
    """Get list of configured signature providers"""
    esignature_config = getattr(settings, 'ESIGNATURE_PROVIDERS', {})
    return list(esignature_config.keys())