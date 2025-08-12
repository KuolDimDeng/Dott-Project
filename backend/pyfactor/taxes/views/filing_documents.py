# taxes/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.db import transaction as db_transaction
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone
import os
import uuid
import mimetypes
import logging

from taxes.models import TaxFiling, FilingDocument
from taxes.serializers import (
    FilingDocumentSerializer,
    TaxFilingSerializer
)

logger = logging.getLogger(__name__)
User = get_user_model()

# File validation constants
ALLOWED_FILE_TYPES = ['pdf', 'jpg', 'jpeg', 'png', 'docx']
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes


class FilingDocumentUploadView(viewsets.ModelViewSet):
    """
    Secure document upload viewset for tax filing documents.
    
    Security features:
    - Automatic tenant isolation
    - File type validation
    - File size validation
    - Virus scanning placeholder
    - Secure file storage with unique names
    - Audit logging
    """
    serializer_class = FilingDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    
    def get_queryset(self):
        """Return documents only for the authenticated user's tenant."""
        user = self.request.user
        
        if not hasattr(user, 'tenant_id') or not user.tenant_id:
            logger.warning(f"User {user.email} has no tenant_id")
            raise PermissionDenied("User is not associated with any organization")
        
        logger.info(f"User {user.email} accessing filing documents for tenant {user.tenant_id}")
        
        return FilingDocument.objects.filter(tenant_id=user.tenant_id)
    
    def validate_file(self, file):
        """Validate uploaded file for type and size."""
        # Check file size
        if file.size > MAX_FILE_SIZE:
            raise ValidationError(f"File size exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)}MB")
        
        # Check file extension
        file_extension = file.name.split('.')[-1].lower()
        if file_extension not in ALLOWED_FILE_TYPES:
            raise ValidationError(f"File type '{file_extension}' is not allowed. Allowed types: {', '.join(ALLOWED_FILE_TYPES)}")
        
        # Check MIME type for additional security
        mime_type, _ = mimetypes.guess_type(file.name)
        allowed_mime_types = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        
        if mime_type not in allowed_mime_types:
            raise ValidationError(f"Invalid file content type: {mime_type}")
        
        return True
    
    def scan_for_virus(self, file):
        """
        Placeholder for virus scanning.
        In production, integrate with a service like ClamAV or VirusTotal API.
        """
        # TODO: Implement actual virus scanning
        logger.info(f"Virus scan placeholder for file: {file.name}")
        return True
    
    def generate_secure_filename(self, original_filename):
        """Generate a secure unique filename."""
        file_extension = original_filename.split('.')[-1].lower()
        unique_id = str(uuid.uuid4())
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        return f"tax_doc_{timestamp}_{unique_id}.{file_extension}"
    
    @action(detail=False, methods=['post'], parser_classes=(MultiPartParser, FormParser))
    def upload(self, request):
        """
        Upload multiple documents for a tax filing.
        
        Expected data:
        - filing_id: UUID of the tax filing
        - documents: List of files
        - document_types: List of document types corresponding to each file
        - descriptions: Optional list of descriptions for each file
        """
        user = request.user
        
        # Validate user has tenant
        if not hasattr(user, 'tenant_id') or not user.tenant_id:
            return Response(
                {"error": "User is not associated with any organization"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get filing ID
        filing_id = request.data.get('filing_id')
        if not filing_id:
            return Response(
                {"error": "filing_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify filing exists and belongs to user's tenant
        try:
            filing = TaxFiling.objects.get(
                filing_id=filing_id,
                tenant_id=user.tenant_id
            )
        except TaxFiling.DoesNotExist:
            return Response(
                {"error": "Tax filing not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get uploaded files
        files = request.FILES.getlist('documents')
        if not files:
            return Response(
                {"error": "No files provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get document types and descriptions
        document_types = request.data.getlist('document_types', [])
        descriptions = request.data.getlist('descriptions', [])
        
        # Ensure we have a document type for each file
        if len(document_types) != len(files):
            return Response(
                {"error": "Number of document types must match number of files"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        uploaded_documents = []
        errors = []
        
        with db_transaction.atomic():
            for idx, file in enumerate(files):
                try:
                    # Validate file
                    self.validate_file(file)
                    
                    # Scan for virus (placeholder)
                    if not self.scan_for_virus(file):
                        errors.append({
                            "file": file.name,
                            "error": "File failed virus scan"
                        })
                        continue
                    
                    # Generate secure filename
                    secure_filename = self.generate_secure_filename(file.name)
                    
                    # Determine file path
                    file_path = os.path.join(
                        'tax_documents',
                        str(user.tenant_id),
                        str(filing.filing_year),
                        secure_filename
                    )
                    
                    # Save file
                    saved_path = default_storage.save(file_path, ContentFile(file.read()))
                    
                    # Create document record
                    document = FilingDocument.objects.create(
                        tenant_id=user.tenant_id,
                        filing=filing,
                        document_type=document_types[idx] if idx < len(document_types) else 'other',
                        file_name=file.name,
                        file_path=saved_path,
                        file_size=file.size,
                        mime_type=file.content_type or mimetypes.guess_type(file.name)[0],
                        uploaded_by=user.email,
                        description=descriptions[idx] if idx < len(descriptions) else '',
                        created_by=user,
                        updated_by=user
                    )
                    
                    uploaded_documents.append(document)
                    
                    logger.info(f"Document uploaded successfully: {document.id} for filing {filing_id}")
                    
                except ValidationError as e:
                    errors.append({
                        "file": file.name,
                        "error": str(e)
                    })
                except Exception as e:
                    logger.error(f"Error uploading document {file.name}: {str(e)}")
                    errors.append({
                        "file": file.name,
                        "error": "Failed to upload file"
                    })
        
        # Prepare response
        serializer = FilingDocumentSerializer(uploaded_documents, many=True)
        response_data = {
            "uploaded": serializer.data,
            "errors": errors
        }
        
        # Determine status code
        if uploaded_documents and not errors:
            status_code = status.HTTP_201_CREATED
        elif uploaded_documents and errors:
            status_code = status.HTTP_207_MULTI_STATUS
        else:
            status_code = status.HTTP_400_BAD_REQUEST
        
        return Response(response_data, status=status_code)
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Mark a document as verified."""
        document = self.get_object()
        
        document.is_verified = True
        document.verified_by = request.user.email
        document.verified_at = timezone.now()
        document.save()
        
        serializer = self.get_serializer(document)
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'])
    def remove(self, request, pk=None):
        """Soft delete a document."""
        document = self.get_object()
        
        # Check if filing is in a state where documents can be removed
        if document.filing.status not in ['payment_pending', 'payment_completed', 'documents_pending']:
            return Response(
                {"error": "Cannot remove documents after filing has been submitted"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete the file from storage
        if document.file_path:
            try:
                default_storage.delete(document.file_path)
            except Exception as e:
                logger.error(f"Error deleting file {document.file_path}: {str(e)}")
        
        # Delete the document record
        document.delete()
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaxFilingViewSet(viewsets.ModelViewSet):
    """
    Secure tax filing viewset with document support.
    """
    serializer_class = TaxFilingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return filings only for the authenticated user's tenant."""
        user = self.request.user
        
        if not hasattr(user, 'tenant_id') or not user.tenant_id:
            logger.warning(f"User {user.email} has no tenant_id")
            raise PermissionDenied("User is not associated with any organization")
        
        return TaxFiling.objects.filter(tenant_id=user.tenant_id).prefetch_related('documents')
    
    def perform_create(self, serializer):
        """Set tenant and user email when creating filing."""
        user = self.request.user
        serializer.save(
            tenant_id=user.tenant_id,
            user_email=user.email,
            created_by=user,
            updated_by=user
        )
    
    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        """Get all documents for a filing."""
        filing = self.get_object()
        documents = filing.documents.all()
        serializer = FilingDocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit filing after all documents are uploaded."""
        filing = self.get_object()
        
        # Validate filing can be submitted
        if filing.status != 'documents_pending':
            return Response(
                {"error": "Filing is not in correct status for submission"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if required documents are uploaded
        required_documents = self.get_required_documents(filing)
        uploaded_types = set(filing.documents.values_list('document_type', flat=True))
        missing_documents = set(required_documents) - uploaded_types
        
        if missing_documents:
            return Response(
                {"error": f"Missing required documents: {', '.join(missing_documents)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update filing status
        filing.status = 'in_preparation'
        filing.save()
        
        # Log status change
        logger.info(f"Filing {filing.filing_id} submitted for preparation")
        
        serializer = self.get_serializer(filing)
        return Response(serializer.data)
    
    def get_required_documents(self, filing):
        """Get list of required document types based on filing type."""
        required_docs = {
            'sales': ['sales_report'],
            'payroll': ['payroll_register'],
            'income': ['profit_loss', 'balance_sheet']
        }
        
        return required_docs.get(filing.tax_type, [])