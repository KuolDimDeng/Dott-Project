"""
Signature Manager

This module manages the complete e-signature workflow including request creation,
status tracking, document retrieval, and webhook handling.
"""

import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import send_mail
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone

from .providers import get_signature_provider, SignatureStatus
from ..models import (
    TaxSignatureRequest, TaxSignatureDocument, TaxSignatureSigner,
    TaxSignatureAuditLog, TaxSignatureWebhook
)

logger = logging.getLogger(__name__)


class SignatureWorkflowError(Exception):
    """Custom exception for signature workflow errors"""
    pass


class SignatureManager:
    """Main class for managing e-signature workflows"""
    
    def __init__(self, tenant_id: str, user_id: str):
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.logger = logging.getLogger(f"{__name__}.{tenant_id}")
    
    def create_signature_request(
        self,
        document_data: bytes,
        document_name: str,
        signers: List[Dict[str, str]],
        metadata: Dict[str, Any] = None,
        provider_name: str = None,
        tax_form_type: str = None,
        tax_year: int = None
    ) -> 'TaxSignatureRequest':
        """
        Create a new signature request
        
        Args:
            document_data: PDF document bytes
            document_name: Name of the document
            signers: List of signer info [{'email': str, 'name': str, 'role': str}]
            metadata: Additional metadata
            provider_name: Preferred signature provider
            tax_form_type: Type of tax form (e.g., '1040', 'W-2')
            tax_year: Tax year for the document
            
        Returns:
            TaxSignatureRequest instance
        """
        try:
            with transaction.atomic():
                # Create signature request record
                signature_request = TaxSignatureRequest.objects.create(
                    tenant_id=self.tenant_id,
                    created_by_id=self.user_id,
                    document_name=document_name,
                    status=SignatureStatus.DRAFT,
                    provider_name=provider_name or settings.ESIGNATURE_DEFAULT_PROVIDER,
                    metadata=metadata or {},
                    tax_form_type=tax_form_type,
                    tax_year=tax_year,
                    expires_at=timezone.now() + timedelta(days=30)
                )
                
                # Store original document
                document_file = ContentFile(document_data, name=document_name)
                TaxSignatureDocument.objects.create(
                    signature_request=signature_request,
                    document_type='original',
                    document_file=document_file,
                    file_size=len(document_data)
                )
                
                # Create signer records
                for signer_data in signers:
                    TaxSignatureSigner.objects.create(
                        signature_request=signature_request,
                        email=signer_data['email'],
                        name=signer_data['name'],
                        role=signer_data.get('role', 'signer'),
                        status='pending'
                    )
                
                # Log the creation
                self._log_audit_event(
                    signature_request,
                    'request_created',
                    f"Signature request created with {len(signers)} signers"
                )
                
                self.logger.info(f"Signature request created: {signature_request.id}")
                return signature_request
                
        except Exception as e:
            self.logger.error(f"Failed to create signature request: {e}")
            raise SignatureWorkflowError(f"Failed to create signature request: {e}")
    
    def send_signature_request(self, signature_request: 'TaxSignatureRequest') -> Dict[str, Any]:
        """
        Send signature request using configured provider
        
        Args:
            signature_request: TaxSignatureRequest instance
            
        Returns:
            Dict with provider response details
        """
        try:
            if signature_request.status != SignatureStatus.DRAFT:
                raise SignatureWorkflowError("Can only send draft signature requests")
            
            # Get provider instance
            provider = get_signature_provider(signature_request.provider_name)
            
            # Get original document
            original_doc = signature_request.documents.filter(document_type='original').first()
            if not original_doc:
                raise SignatureWorkflowError("No original document found")
            
            # Prepare signers data
            signers_data = []
            for signer in signature_request.signers.all():
                signers_data.append({
                    'email': signer.email,
                    'name': signer.name,
                    'role': signer.role
                })
            
            # Prepare metadata
            metadata = {
                'subject': f"Tax Document Signature Request - {signature_request.document_name}",
                'document_name': signature_request.document_name,
                'tax_form_type': signature_request.tax_form_type,
                'tax_year': signature_request.tax_year,
                'tenant_id': self.tenant_id
            }
            metadata.update(signature_request.metadata)
            
            # Create signature request with provider
            with original_doc.document_file.open('rb') as doc_file:
                provider_response = provider.create_signature_request(
                    document_data=doc_file.read(),
                    signers=signers_data,
                    metadata=metadata
                )
            
            if provider_response.get('status') == SignatureStatus.ERROR:
                raise SignatureWorkflowError(provider_response.get('error', 'Provider error'))
            
            # Update signature request with provider details
            with transaction.atomic():
                signature_request.provider_request_id = provider_response['request_id']
                signature_request.status = provider_response['status']
                signature_request.provider_data = provider_response
                signature_request.sent_at = timezone.now()
                signature_request.save()
                
                # Update signers with signing URLs
                signing_urls = provider_response.get('signing_urls', {})
                for signer in signature_request.signers.all():
                    if signer.email in signing_urls:
                        signer.signing_url = signing_urls[signer.email]
                        signer.save()
                
                # Log the send event
                self._log_audit_event(
                    signature_request,
                    'request_sent',
                    f"Signature request sent via {signature_request.provider_name}"
                )
            
            # Send notification emails
            self._send_signature_notifications(signature_request)
            
            self.logger.info(f"Signature request sent: {signature_request.id}")
            return provider_response
            
        except Exception as e:
            self.logger.error(f"Failed to send signature request: {e}")
            
            # Update status to error
            signature_request.status = SignatureStatus.ERROR
            signature_request.error_message = str(e)
            signature_request.save()
            
            self._log_audit_event(
                signature_request,
                'send_failed',
                f"Failed to send signature request: {e}"
            )
            
            raise SignatureWorkflowError(f"Failed to send signature request: {e}")
    
    def check_signature_status(self, signature_request: 'TaxSignatureRequest') -> Dict[str, Any]:
        """
        Check and update signature request status
        
        Args:
            signature_request: TaxSignatureRequest instance
            
        Returns:
            Dict with current status information
        """
        try:
            if not signature_request.provider_request_id:
                return {'status': signature_request.status}
            
            # Get provider instance
            provider = get_signature_provider(signature_request.provider_name)
            
            # Get status from provider
            status_response = provider.get_signature_status(signature_request.provider_request_id)
            
            if status_response.get('status') == SignatureStatus.ERROR:
                self.logger.error(f"Provider status check failed: {status_response.get('error')}")
                return status_response
            
            # Update local status if changed
            old_status = signature_request.status
            new_status = status_response.get('status')
            
            if old_status != new_status:
                with transaction.atomic():
                    signature_request.status = new_status
                    signature_request.provider_data.update(status_response)
                    
                    if new_status == SignatureStatus.COMPLETED:
                        signature_request.completed_at = timezone.now()
                    
                    signature_request.save()
                    
                    # Log status change
                    self._log_audit_event(
                        signature_request,
                        'status_changed',
                        f"Status changed from {old_status} to {new_status}"
                    )
                
                # Handle completion
                if new_status == SignatureStatus.COMPLETED:
                    self._handle_signature_completion(signature_request)
            
            return status_response
            
        except Exception as e:
            self.logger.error(f"Failed to check signature status: {e}")
            return {'status': SignatureStatus.ERROR, 'error': str(e)}
    
    def download_signed_document(self, signature_request: 'TaxSignatureRequest') -> bytes:
        """
        Download signed document from provider
        
        Args:
            signature_request: TaxSignatureRequest instance
            
        Returns:
            Signed document bytes
        """
        try:
            if signature_request.status != SignatureStatus.COMPLETED:
                raise SignatureWorkflowError("Document is not yet completed")
            
            # Check if we already have the signed document stored
            signed_doc = signature_request.documents.filter(document_type='signed').first()
            if signed_doc:
                with signed_doc.document_file.open('rb') as doc_file:
                    return doc_file.read()
            
            # Download from provider
            provider = get_signature_provider(signature_request.provider_name)
            signed_data = provider.download_signed_document(signature_request.provider_request_id)
            
            # Store signed document
            signed_file = ContentFile(
                signed_data,
                name=f"signed_{signature_request.document_name}"
            )
            
            TaxSignatureDocument.objects.create(
                signature_request=signature_request,
                document_type='signed',
                document_file=signed_file,
                file_size=len(signed_data)
            )
            
            self._log_audit_event(
                signature_request,
                'document_downloaded',
                "Signed document downloaded and stored"
            )
            
            return signed_data
            
        except Exception as e:
            self.logger.error(f"Failed to download signed document: {e}")
            raise SignatureWorkflowError(f"Failed to download signed document: {e}")
    
    def cancel_signature_request(self, signature_request: 'TaxSignatureRequest') -> bool:
        """
        Cancel a signature request
        
        Args:
            signature_request: TaxSignatureRequest instance
            
        Returns:
            Success status
        """
        try:
            if signature_request.status in [SignatureStatus.COMPLETED, SignatureStatus.CANCELLED]:
                return True
            
            success = True
            
            # Cancel with provider if sent
            if signature_request.provider_request_id:
                provider = get_signature_provider(signature_request.provider_name)
                success = provider.cancel_signature_request(signature_request.provider_request_id)
            
            if success:
                with transaction.atomic():
                    signature_request.status = SignatureStatus.CANCELLED
                    signature_request.cancelled_at = timezone.now()
                    signature_request.save()
                    
                    # Update all signers
                    signature_request.signers.update(status='cancelled')
                    
                    self._log_audit_event(
                        signature_request,
                        'request_cancelled',
                        "Signature request cancelled"
                    )
            
            return success
            
        except Exception as e:
            self.logger.error(f"Failed to cancel signature request: {e}")
            return False
    
    def handle_webhook(self, provider_name: str, payload: Dict, headers: Dict) -> bool:
        """
        Handle webhook from signature provider
        
        Args:
            provider_name: Name of the provider
            payload: Webhook payload
            headers: Request headers
            
        Returns:
            Processing success status
        """
        try:
            # Get provider instance
            provider = get_signature_provider(provider_name)
            
            # Validate webhook authenticity
            if not provider.validate_webhook(payload, headers):
                self.logger.warning(f"Invalid webhook from {provider_name}")
                return False
            
            # Log webhook
            webhook_log = TaxSignatureWebhook.objects.create(
                provider_name=provider_name,
                event_type=payload.get('event_type', 'unknown'),
                payload=payload,
                headers=dict(headers),
                processed=False
            )
            
            # Process webhook based on event type
            success = self._process_webhook_event(payload, provider_name)
            
            # Update webhook log
            webhook_log.processed = success
            webhook_log.processed_at = timezone.now()
            webhook_log.save()
            
            return success
            
        except Exception as e:
            self.logger.error(f"Webhook processing failed: {e}")
            return False
    
    def get_signature_requests(
        self,
        status: str = None,
        tax_form_type: str = None,
        tax_year: int = None
    ) -> List['TaxSignatureRequest']:
        """
        Get signature requests for the tenant
        
        Args:
            status: Filter by status
            tax_form_type: Filter by tax form type
            tax_year: Filter by tax year
            
        Returns:
            List of TaxSignatureRequest instances
        """
        queryset = TaxSignatureRequest.objects.filter(tenant_id=self.tenant_id)
        
        if status:
            queryset = queryset.filter(status=status)
        if tax_form_type:
            queryset = queryset.filter(tax_form_type=tax_form_type)
        if tax_year:
            queryset = queryset.filter(tax_year=tax_year)
        
        return queryset.order_by('-created_at')
    
    def _handle_signature_completion(self, signature_request: 'TaxSignatureRequest'):
        """Handle signature request completion"""
        try:
            # Download and store signed document
            self.download_signed_document(signature_request)
            
            # Send completion notifications
            self._send_completion_notifications(signature_request)
            
            # Trigger any completion webhooks or integrations
            self._trigger_completion_integrations(signature_request)
            
        except Exception as e:
            self.logger.error(f"Failed to handle signature completion: {e}")
    
    def _process_webhook_event(self, payload: Dict, provider_name: str) -> bool:
        """Process webhook event"""
        try:
            event_type = payload.get('event_type', '')
            request_id = payload.get('signature_request_id') or payload.get('agreement_id')
            
            if not request_id:
                self.logger.warning("Webhook missing signature request ID")
                return False
            
            # Find signature request
            signature_request = TaxSignatureRequest.objects.filter(
                provider_request_id=request_id,
                provider_name=provider_name
            ).first()
            
            if not signature_request:
                self.logger.warning(f"Signature request not found: {request_id}")
                return False
            
            # Update status based on event
            status_mapping = {
                'signature_request_signed': SignatureStatus.SIGNED,
                'signature_request_all_signed': SignatureStatus.COMPLETED,
                'signature_request_declined': SignatureStatus.DECLINED,
                'signature_request_cancelled': SignatureStatus.CANCELLED,
                'signature_request_expired': SignatureStatus.EXPIRED
            }
            
            new_status = status_mapping.get(event_type)
            if new_status and signature_request.status != new_status:
                old_status = signature_request.status
                signature_request.status = new_status
                signature_request.save()
                
                self._log_audit_event(
                    signature_request,
                    'webhook_status_update',
                    f"Status updated via webhook from {old_status} to {new_status}"
                )
                
                if new_status == SignatureStatus.COMPLETED:
                    self._handle_signature_completion(signature_request)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to process webhook event: {e}")
            return False
    
    def _send_signature_notifications(self, signature_request: 'TaxSignatureRequest'):
        """Send signature request notifications to signers"""
        try:
            for signer in signature_request.signers.all():
                if signer.signing_url:
                    context = {
                        'signer_name': signer.name,
                        'document_name': signature_request.document_name,
                        'signing_url': signer.signing_url,
                        'expires_at': signature_request.expires_at,
                        'tax_form_type': signature_request.tax_form_type,
                        'tax_year': signature_request.tax_year
                    }
                    
                    subject = f"Tax Document Signature Request - {signature_request.document_name}"
                    message = render_to_string('taxes/esignature/signature_request_email.html', context)
                    
                    send_mail(
                        subject=subject,
                        message=message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[signer.email],
                        html_message=message
                    )
                    
                    self.logger.info(f"Signature notification sent to {signer.email}")
                    
        except Exception as e:
            self.logger.error(f"Failed to send signature notifications: {e}")
    
    def _send_completion_notifications(self, signature_request: 'TaxSignatureRequest'):
        """Send completion notifications"""
        try:
            # Notify document creator
            context = {
                'document_name': signature_request.document_name,
                'completed_at': signature_request.completed_at,
                'tax_form_type': signature_request.tax_form_type,
                'tax_year': signature_request.tax_year
            }
            
            subject = f"Tax Document Signed - {signature_request.document_name}"
            message = render_to_string('taxes/esignature/signature_completed_email.html', context)
            
            # Get creator email (would need user model integration)
            creator_email = "placeholder@example.com"  # Replace with actual user email
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[creator_email],
                html_message=message
            )
            
        except Exception as e:
            self.logger.error(f"Failed to send completion notifications: {e}")
    
    def _trigger_completion_integrations(self, signature_request: 'TaxSignatureRequest'):
        """Trigger any external integrations on completion"""
        try:
            # This could trigger integrations with tax software, document management systems, etc.
            self.logger.info(f"Signature completion integrations triggered for {signature_request.id}")
            
        except Exception as e:
            self.logger.error(f"Failed to trigger completion integrations: {e}")
    
    def _log_audit_event(
        self,
        signature_request: 'TaxSignatureRequest',
        event_type: str,
        description: str,
        metadata: Dict = None
    ):
        """Log audit event"""
        try:
            TaxSignatureAuditLog.objects.create(
                signature_request=signature_request,
                event_type=event_type,
                description=description,
                user_id=self.user_id,
                metadata=metadata or {},
                ip_address=getattr(self, 'request_ip', None)
            )
        except Exception as e:
            self.logger.error(f"Failed to log audit event: {e}")


def create_signature_manager(tenant_id: str, user_id: str) -> SignatureManager:
    """Factory function to create SignatureManager instance"""
    return SignatureManager(tenant_id, user_id)