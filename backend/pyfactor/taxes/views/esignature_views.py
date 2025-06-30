"""
E-Signature API Views

This module provides REST API endpoints for managing e-signature workflows
for tax documents.
"""

import logging
from django.http import JsonResponse, FileResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
from django.contrib.auth.decorators import login_required
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

import json
from typing import Dict, Any

from ..models import (
    TaxSignatureRequest, TaxSignatureDocument, TaxSignatureSigner,
    TaxSignatureAuditLog, TaxSignatureWebhook
)
from ..esignature.signature_manager import SignatureManager, SignatureWorkflowError
from ..esignature.providers import get_signature_provider, get_available_providers

logger = logging.getLogger(__name__)


class TaxSignatureRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tax signature requests"""
    
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return signature requests for the current tenant"""
        return TaxSignatureRequest.objects.filter(tenant_id=self.request.user.tenant_id)
    
    def list(self, request):
        """List signature requests with filtering and pagination"""
        try:
            queryset = self.get_queryset()
            
            # Apply filters
            status_filter = request.GET.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            tax_form_type = request.GET.get('tax_form_type')
            if tax_form_type:
                queryset = queryset.filter(tax_form_type=tax_form_type)
            
            tax_year = request.GET.get('tax_year')
            if tax_year:
                queryset = queryset.filter(tax_year=int(tax_year))
            
            # Pagination
            page_size = min(int(request.GET.get('page_size', 20)), 100)
            paginator = Paginator(queryset, page_size)
            page = request.GET.get('page', 1)
            
            try:
                page_obj = paginator.page(page)
            except Exception:
                page_obj = paginator.page(1)
            
            # Serialize results
            results = []
            for signature_request in page_obj:
                results.append({
                    'id': str(signature_request.id),
                    'document_name': signature_request.document_name,
                    'tax_form_type': signature_request.tax_form_type,
                    'tax_year': signature_request.tax_year,
                    'status': signature_request.status,
                    'status_display': signature_request.get_status_display(),
                    'provider_name': signature_request.provider_name,
                    'provider_display': signature_request.get_provider_name_display(),
                    'signers_count': signature_request.signers.count(),
                    'signed_count': signature_request.signers.filter(status='signed').count(),
                    'created_at': signature_request.created_at.isoformat(),
                    'sent_at': signature_request.sent_at.isoformat() if signature_request.sent_at else None,
                    'completed_at': signature_request.completed_at.isoformat() if signature_request.completed_at else None,
                    'expires_at': signature_request.expires_at.isoformat() if signature_request.expires_at else None,
                })
            
            return Response({
                'results': results,
                'count': paginator.count,
                'page': page_obj.number,
                'total_pages': paginator.num_pages,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
            })
            
        except Exception as e:
            logger.error(f"Failed to list signature requests: {e}")
            return Response(
                {'error': 'Failed to retrieve signature requests'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def create(self, request):
        """Create a new signature request"""
        try:
            data = request.data
            
            # Validate required fields
            required_fields = ['document_name', 'signers']
            for field in required_fields:
                if field not in data:
                    return Response(
                        {'error': f'Missing required field: {field}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Validate document file
            if 'document_file' not in request.FILES:
                return Response(
                    {'error': 'Document file is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            document_file = request.FILES['document_file']
            if not document_file.name.lower().endswith('.pdf'):
                return Response(
                    {'error': 'Only PDF files are supported'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create signature manager
            signature_manager = SignatureManager(
                tenant_id=request.user.tenant_id,
                user_id=request.user.id
            )
            
            # Read document data
            document_data = document_file.read()
            
            # Create signature request
            signature_request = signature_manager.create_signature_request(
                document_data=document_data,
                document_name=data['document_name'],
                signers=data['signers'],
                metadata=data.get('metadata', {}),
                provider_name=data.get('provider_name'),
                tax_form_type=data.get('tax_form_type'),
                tax_year=data.get('tax_year')
            )
            
            return Response({
                'id': str(signature_request.id),
                'document_name': signature_request.document_name,
                'status': signature_request.status,
                'signers_count': signature_request.signers.count(),
                'created_at': signature_request.created_at.isoformat(),
            }, status=status.HTTP_201_CREATED)
            
        except SignatureWorkflowError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Failed to create signature request: {e}")
            return Response(
                {'error': 'Failed to create signature request'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, pk=None):
        """Get detailed information about a signature request"""
        try:
            signature_request = get_object_or_404(
                self.get_queryset(),
                pk=pk
            )
            
            # Get signers
            signers = []
            for signer in signature_request.signers.all():
                signers.append({
                    'id': str(signer.id),
                    'email': signer.email,
                    'name': signer.name,
                    'role': signer.role,
                    'status': signer.status,
                    'status_display': signer.get_status_display(),
                    'signed_at': signer.signed_at.isoformat() if signer.signed_at else None,
                    'signing_url': signer.signing_url if signer.status in ['pending', 'sent'] else None,
                })
            
            # Get documents
            documents = []
            for doc in signature_request.documents.all():
                documents.append({
                    'id': str(doc.id),
                    'document_type': doc.document_type,
                    'document_type_display': doc.get_document_type_display(),
                    'file_name': doc.file_name,
                    'file_size': doc.file_size,
                    'created_at': doc.created_at.isoformat(),
                })
            
            return Response({
                'id': str(signature_request.id),
                'document_name': signature_request.document_name,
                'tax_form_type': signature_request.tax_form_type,
                'tax_year': signature_request.tax_year,
                'status': signature_request.status,
                'status_display': signature_request.get_status_display(),
                'provider_name': signature_request.provider_name,
                'provider_display': signature_request.get_provider_name_display(),
                'created_at': signature_request.created_at.isoformat(),
                'sent_at': signature_request.sent_at.isoformat() if signature_request.sent_at else None,
                'completed_at': signature_request.completed_at.isoformat() if signature_request.completed_at else None,
                'expires_at': signature_request.expires_at.isoformat() if signature_request.expires_at else None,
                'signers': signers,
                'documents': documents,
                'metadata': signature_request.metadata,
                'error_message': signature_request.error_message,
            })
            
        except Exception as e:
            logger.error(f"Failed to retrieve signature request: {e}")
            return Response(
                {'error': 'Failed to retrieve signature request'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, pk=None):
        """Update signature request (limited operations)"""
        try:
            signature_request = get_object_or_404(
                self.get_queryset(),
                pk=pk
            )
            
            # Only allow updates for draft requests
            if signature_request.status != 'draft':
                return Response(
                    {'error': 'Can only update draft signature requests'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            data = request.data
            
            # Update allowed fields
            if 'document_name' in data:
                signature_request.document_name = data['document_name']
            
            if 'tax_form_type' in data:
                signature_request.tax_form_type = data['tax_form_type']
            
            if 'tax_year' in data:
                signature_request.tax_year = data['tax_year']
            
            if 'metadata' in data:
                signature_request.metadata.update(data['metadata'])
            
            signature_request.save()
            
            return Response({
                'id': str(signature_request.id),
                'document_name': signature_request.document_name,
                'status': signature_request.status,
                'updated_at': signature_request.updated_at.isoformat(),
            })
            
        except Exception as e:
            logger.error(f"Failed to update signature request: {e}")
            return Response(
                {'error': 'Failed to update signature request'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_signature_request(request, signature_id):
    """Send a signature request to signers"""
    try:
        # Get the signature request
        signature_request = get_object_or_404(
            TaxSignatureRequest,
            pk=signature_id,
            tenant_id=request.user.tenant_id
        )
        
        # Create signature manager
        signature_manager = SignatureManager(
            tenant_id=request.user.tenant_id,
            user_id=request.user.id
        )
        
        # Send the signature request
        result = signature_manager.send_signature_request(signature_request)
        
        return Response({
            'success': True,
            'message': 'Signature request sent successfully',
            'provider_response': result
        })
        
    except SignatureWorkflowError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Failed to send signature request: {e}")
        return Response(
            {'error': 'Failed to send signature request'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_signature_request(request, signature_id):
    """Cancel a signature request"""
    try:
        # Get the signature request
        signature_request = get_object_or_404(
            TaxSignatureRequest,
            pk=signature_id,
            tenant_id=request.user.tenant_id
        )
        
        # Create signature manager
        signature_manager = SignatureManager(
            tenant_id=request.user.tenant_id,
            user_id=request.user.id
        )
        
        # Cancel the signature request
        success = signature_manager.cancel_signature_request(signature_request)
        
        if success:
            return Response({
                'success': True,
                'message': 'Signature request cancelled successfully'
            })
        else:
            return Response(
                {'error': 'Failed to cancel signature request'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    except Exception as e:
        logger.error(f"Failed to cancel signature request: {e}")
        return Response(
            {'error': 'Failed to cancel signature request'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_signature_status(request, signature_id):
    """Check and update signature request status"""
    try:
        # Get the signature request
        signature_request = get_object_or_404(
            TaxSignatureRequest,
            pk=signature_id,
            tenant_id=request.user.tenant_id
        )
        
        # Create signature manager
        signature_manager = SignatureManager(
            tenant_id=request.user.tenant_id,
            user_id=request.user.id
        )
        
        # Check status
        status_info = signature_manager.check_signature_status(signature_request)
        
        return Response({
            'signature_id': str(signature_request.id),
            'status': signature_request.status,
            'status_display': signature_request.get_status_display(),
            'provider_status': status_info,
            'updated_at': signature_request.updated_at.isoformat(),
        })
        
    except Exception as e:
        logger.error(f"Failed to check signature status: {e}")
        return Response(
            {'error': 'Failed to check signature status'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_signed_document(request, signature_id):
    """Download the signed document"""
    try:
        # Get the signature request
        signature_request = get_object_or_404(
            TaxSignatureRequest,
            pk=signature_id,
            tenant_id=request.user.tenant_id
        )
        
        if signature_request.status != 'completed':
            return JsonResponse(
                {'error': 'Document is not yet completed'},
                status=400
            )
        
        # Get signed document
        signed_doc = signature_request.documents.filter(document_type='signed').first()
        if not signed_doc:
            # Try to download from provider
            signature_manager = SignatureManager(
                tenant_id=request.user.tenant_id,
                user_id=request.user.id
            )
            
            try:
                signature_manager.download_signed_document(signature_request)
                signed_doc = signature_request.documents.filter(document_type='signed').first()
            except SignatureWorkflowError as e:
                return JsonResponse({'error': str(e)}, status=400)
        
        if not signed_doc:
            return JsonResponse({'error': 'Signed document not available'}, status=404)
        
        # Return file response
        response = FileResponse(
            signed_doc.document_file.open('rb'),
            content_type='application/pdf'
        )
        response['Content-Disposition'] = f'attachment; filename="signed_{signed_doc.file_name}"'
        
        return response
        
    except Exception as e:
        logger.error(f"Failed to download signed document: {e}")
        return JsonResponse(
            {'error': 'Failed to download signed document'},
            status=500
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_audit_trail(request, signature_id):
    """Get audit trail for a signature request"""
    try:
        # Get the signature request
        signature_request = get_object_or_404(
            TaxSignatureRequest,
            pk=signature_id,
            tenant_id=request.user.tenant_id
        )
        
        # Get audit logs
        audit_logs = signature_request.audit_logs.all()
        
        logs = []
        for log in audit_logs:
            logs.append({
                'id': str(log.id),
                'event_type': log.event_type,
                'event_type_display': log.get_event_type_display(),
                'description': log.description,
                'user': log.user.email if log.user else None,
                'ip_address': log.ip_address,
                'metadata': log.metadata,
                'created_at': log.created_at.isoformat(),
            })
        
        return Response({
            'signature_id': str(signature_request.id),
            'audit_logs': logs
        })
        
    except Exception as e:
        logger.error(f"Failed to get audit trail: {e}")
        return Response(
            {'error': 'Failed to retrieve audit trail'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_available_providers(request):
    """Get list of available signature providers"""
    try:
        providers = get_available_providers()
        provider_info = []
        
        for provider_name in providers:
            try:
                provider = get_signature_provider(provider_name)
                provider_info.append({
                    'name': provider_name,
                    'display_name': provider_name.replace('_', ' ').title(),
                    'available': True
                })
            except Exception:
                provider_info.append({
                    'name': provider_name,
                    'display_name': provider_name.replace('_', ' ').title(),
                    'available': False
                })
        
        return Response({
            'providers': provider_info
        })
        
    except Exception as e:
        logger.error(f"Failed to get available providers: {e}")
        return Response(
            {'error': 'Failed to retrieve available providers'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt
@require_http_methods(["POST"])
def webhook_handler(request, provider_name):
    """Handle webhooks from signature providers"""
    try:
        # Parse payload
        payload = json.loads(request.body.decode('utf-8'))
        headers = dict(request.META)
        
        # Create signature manager (no tenant/user context needed for webhooks)
        signature_manager = SignatureManager(
            tenant_id='webhook',  # Placeholder - will be determined from payload
            user_id='system'  # System user for webhook processing
        )
        
        # Handle webhook
        success = signature_manager.handle_webhook(provider_name, payload, headers)
        
        if success:
            return JsonResponse({'status': 'success'})
        else:
            return JsonResponse({'status': 'error'}, status=400)
        
    except Exception as e:
        logger.error(f"Webhook handling failed: {e}")
        return JsonResponse({'status': 'error'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_signature_statistics(request):
    """Get signature statistics for the tenant"""
    try:
        queryset = TaxSignatureRequest.objects.filter(tenant_id=request.user.tenant_id)
        
        stats = {
            'total_requests': queryset.count(),
            'completed': queryset.filter(status='completed').count(),
            'pending': queryset.filter(status__in=['draft', 'sent', 'signed']).count(),
            'cancelled': queryset.filter(status='cancelled').count(),
            'by_status': {},
            'by_provider': {},
            'by_tax_form_type': {},
        }
        
        # Status breakdown
        for choice in TaxSignatureRequest.STATUS_CHOICES:
            status_code = choice[0]
            stats['by_status'][status_code] = queryset.filter(status=status_code).count()
        
        # Provider breakdown
        for choice in TaxSignatureRequest.PROVIDER_CHOICES:
            provider_code = choice[0]
            stats['by_provider'][provider_code] = queryset.filter(provider_name=provider_code).count()
        
        # Tax form type breakdown
        form_types = queryset.values_list('tax_form_type', flat=True).distinct()
        for form_type in form_types:
            if form_type:
                stats['by_tax_form_type'][form_type] = queryset.filter(tax_form_type=form_type).count()
        
        return Response(stats)
        
    except Exception as e:
        logger.error(f"Failed to get signature statistics: {e}")
        return Response(
            {'error': 'Failed to retrieve signature statistics'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )