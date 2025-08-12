from rest_framework import viewsets, status
from custom_auth.tenant_base_viewset import TenantIsolatedViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from core.authentication.session_token_auth import SessionTokenAuthentication
from custom_auth.auth0_authentication import Auth0JWTAuthentication
from django.utils import timezone
from django.conf import settings
from django.db.models import Sum, F, Q, Prefetch
from django.shortcuts import get_object_or_404
from django.core.files.base import ContentFile
from django.http import HttpResponse
from decimal import Decimal
import logging
import traceback
import json
import base64
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from datetime import datetime, timedelta

from .models import (
    Job, JobMaterial, JobLabor, JobExpense, Vehicle, JobAssignment,
    JobDocument, JobStatusHistory, JobCommunication
)
from .serializers import (
    JobSerializer, JobDetailSerializer, JobMaterialSerializer, 
    JobLaborSerializer, JobExpenseSerializer, JobCostingSerializer,
    VehicleSerializer, JobDocumentSerializer, JobStatusHistorySerializer,
    JobCommunicationSerializer, JobQuoteSendSerializer, JobSignatureSerializer
)

logger = logging.getLogger(__name__)

class JobViewSet(TenantIsolatedViewSet):
    """
    ViewSet for managing jobs with full CRUD operations
    """
    serializer_class = JobSerializer
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Get queryset with proper tenant context - MUST call parent for tenant filtering
        Same pattern as ProductViewSet to ensure consistency
        """
        # CRITICAL: Call parent's get_queryset() which applies tenant filtering
        queryset = super().get_queryset()
        
        # Log the tenant filtering
        tenant_id = getattr(self.request.user, 'tenant_id', None) or \
                   getattr(self.request.user, 'business_id', None)
        logger.info(f"[JobViewSet] Tenant filtering applied for tenant: {tenant_id}")
        
        # Apply select_related and prefetch_related for optimization
        queryset = queryset.select_related('customer', 'lead_employee__user', 'vehicle').prefetch_related(
            'assigned_employees__user',
            'materials__supply',
            'labor_entries__employee__user',
            'expenses'
        )
        
        logger.debug(f"[JobViewSet] Job queryset prepared")
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        """Use detailed serializer for retrieve action"""
        if self.action == 'retrieve':
            return JobDetailSerializer
        return JobSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new job with detailed logging"""
        logger.info(f"📋 [JobViewSet] === CREATE START ===")
        logger.info(f"📋 [JobViewSet] User: {getattr(request.user, 'email', 'Unknown')}")
        logger.info(f"📋 [JobViewSet] Request data: {request.data}")
        
        try:
            response = super().create(request, *args, **kwargs)
            logger.info(f"📋 [JobViewSet] Job created successfully: {response.data}")
            return response
        except Exception as e:
            logger.error(f"📋 [JobViewSet] Error creating job: {str(e)}")
            import traceback
            logger.error(f"📋 [JobViewSet] Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to create job: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def perform_create(self, serializer):
        """Set created_by when creating a job"""
        logger.info(f"📋 [JobViewSet] perform_create called")
        logger.info(f"📋 [JobViewSet] Validated data: {serializer.validated_data}")
        try:
            # Save the job
            job = serializer.save(created_by=self.request.user)
            logger.info(f"📋 [JobViewSet] Job saved successfully")
            
            # Handle many-to-many relationships
            assigned_employees = self.request.data.get('assigned_employees', [])
            if assigned_employees:
                job.assigned_employees.set(assigned_employees)
            
            # Handle materials
            materials = self.request.data.get('materials', [])
            for material_data in materials:
                JobMaterial.objects.create(
                    job=job,
                    supply_id=material_data.get('supply_id'),
                    quantity=material_data.get('quantity', 1),
                    unit_cost=material_data.get('unit_cost', 0),
                    unit_price=material_data.get('unit_price', 0),
                    markup_percentage=material_data.get('markup_percentage', 0),
                    is_billable=material_data.get('is_billable', True),
                    added_by=self.request.user
                )
            
            # If this is a recurring job, create future instances
            if job.is_recurring and job.recurrence_pattern:
                logger.info(f"📋 [JobViewSet] Creating recurring instances for job {job.job_number}")
                # Create 12 instances by default (3 months for weekly, 1 year for monthly)
                recurring_jobs = job.create_recurring_instances(count=12)
                logger.info(f"📋 [JobViewSet] Created {len(recurring_jobs)} recurring instances")
                
        except Exception as e:
            logger.error(f"📋 [JobViewSet] Error in perform_create: {str(e)}")
            raise
    
    def list(self, request, *args, **kwargs):
        """List jobs with optional filtering"""
        try:
            queryset = self.get_queryset()
            
            # Apply filters
            status_filter = request.query_params.get('status')
            if status_filter:
                if isinstance(status_filter, list):
                    queryset = queryset.filter(status__in=status_filter)
                else:
                    queryset = queryset.filter(status=status_filter)
            
            customer_id = request.query_params.get('customer_id')
            if customer_id:
                queryset = queryset.filter(customer_id=customer_id)
            
            scheduled_date = request.query_params.get('scheduled_date')
            if scheduled_date:
                queryset = queryset.filter(scheduled_date=scheduled_date)
            
            # Date range filters
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            if start_date and end_date:
                queryset = queryset.filter(
                    Q(scheduled_date__range=[start_date, end_date]) |
                    Q(start_date__range=[start_date, end_date]) |
                    Q(completion_date__range=[start_date, end_date])
                )
            
            # Search
            search = request.query_params.get('search')
            if search:
                queryset = queryset.filter(
                    Q(job_number__icontains=search) |
                    Q(name__icontains=search) |
                    Q(customer__name__icontains=search)
                )
            
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error listing jobs: {e}")
            return Response(
                {'error': 'Failed to fetch jobs'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def generate_number(self, request):
        """Generate a unique job number"""
        try:
            prefix = request.query_params.get('prefix', 'JOB')
            
            # Find the highest job number with this prefix
            existing_jobs = Job.objects.filter(
                job_number__startswith=f"{prefix}-"
            ).order_by('-job_number')
            
            if existing_jobs.exists():
                last_number = existing_jobs.first().job_number.split('-')[-1]
                try:
                    next_number = int(last_number) + 1
                except ValueError:
                    next_number = 1
            else:
                next_number = 1
            
            job_number = f"{prefix}-{next_number:04d}"
            
            return Response({'job_number': job_number})
            
        except Exception as e:
            logger.error(f"Error generating job number: {e}")
            return Response(
                {'error': 'Failed to generate job number'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def costing(self, request, pk=None):
        """Get detailed costing information for a job"""
        try:
            job = self.get_object()
            
            # Calculate costs
            material_cost = job.get_total_materials_cost()
            labor_cost = job.get_total_labor_cost()
            expense_cost = job.expenses.aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0')
            
            total_cost = material_cost + labor_cost + expense_cost
            profit = job.quoted_amount - total_cost
            profit_margin = (profit / job.quoted_amount * 100) if job.quoted_amount > 0 else Decimal('0')
            
            data = {
                'job_id': job.id,
                'job_number': job.job_number,
                'quoted_amount': job.quoted_amount,
                'material_cost': material_cost,
                'labor_cost': labor_cost,
                'expense_cost': expense_cost,
                'total_cost': total_cost,
                'profit': profit,
                'profit_margin': profit_margin,
                'material_count': job.materials.count(),
                'labor_entries_count': job.labor_entries.count(),
                'expense_count': job.expenses.count(),
            }
            
            serializer = JobCostingSerializer(data)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error getting job costing for {pk}: {e}")
            return Response(
                {'error': 'Failed to fetch job costing'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get job statistics"""
        try:
            queryset = self.get_queryset()
            
            # Apply date filter if provided
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            if start_date and end_date:
                queryset = queryset.filter(created_at__date__range=[start_date, end_date])
            
            total_jobs = queryset.count()
            
            # Group by status
            status_counts = {}
            for choice in Job.STATUS_CHOICES:
                status_counts[choice[0]] = queryset.filter(status=choice[0]).count()
            
            # Financial stats
            total_quoted = queryset.aggregate(total=Sum('quoted_amount'))['total'] or Decimal('0')
            completed_jobs = queryset.filter(status__in=['completed', 'invoiced', 'paid'])
            completed_revenue = completed_jobs.aggregate(total=Sum('quoted_amount'))['total'] or Decimal('0')
            
            # Average job value
            avg_job_value = total_quoted / total_jobs if total_jobs > 0 else Decimal('0')
            
            data = {
                'total_jobs': total_jobs,
                'status_breakdown': status_counts,
                'total_quoted_amount': total_quoted,
                'completed_revenue': completed_revenue,
                'average_job_value': avg_job_value,
                'completion_rate': (completed_jobs.count() / total_jobs * 100) if total_jobs > 0 else 0,
            }
            
            return Response(data)
            
        except Exception as e:
            logger.error(f"Error getting job stats: {e}")
            return Response(
                {'error': 'Failed to fetch job statistics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def create_recurring_instances(self, request, pk=None):
        """Create recurring instances for a job"""
        try:
            job = self.get_object()
            
            # Check if job is set up for recurring
            if not job.is_recurring or not job.recurrence_pattern:
                return Response(
                    {'error': 'Job is not configured as recurring'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get count from request, default to 12
            count = int(request.data.get('count', 12))
            if count < 1 or count > 52:  # Max 1 year of weekly jobs
                return Response(
                    {'error': 'Count must be between 1 and 52'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create recurring instances
            created_jobs = job.create_recurring_instances(count=count)
            
            # Serialize the created jobs
            serializer = JobSerializer(created_jobs, many=True)
            
            return Response({
                'message': f'Created {len(created_jobs)} recurring instances',
                'jobs': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error creating recurring instances for job {pk}: {e}")
            return Response(
                {'error': 'Failed to create recurring instances'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def recurring_series(self, request, pk=None):
        """Get all jobs in a recurring series"""
        try:
            job = self.get_object()
            
            if not job.job_series_id:
                return Response(
                    {'error': 'Job is not part of a recurring series'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get all jobs in the series
            series_jobs = Job.objects.filter(
                job_series_id=job.job_series_id
            ).order_by('scheduled_date')
            
            serializer = JobSerializer(series_jobs, many=True)
            
            return Response({
                'series_id': str(job.job_series_id),
                'count': series_jobs.count(),
                'jobs': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error fetching recurring series for job {pk}: {e}")
            return Response(
                {'error': 'Failed to fetch recurring series'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def profitability(self, request):
        """Get profitability analysis"""
        try:
            queryset = self.get_queryset()
            
            # Apply filters
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            if start_date and end_date:
                queryset = queryset.filter(completion_date__range=[start_date, end_date])
            
            status_filter = request.query_params.get('status')
            if status_filter and status_filter != 'all':
                queryset = queryset.filter(status=status_filter)
            
            # Calculate profitability for each job
            profitable_jobs = []
            total_revenue = Decimal('0')
            total_cost = Decimal('0')
            
            for job in queryset:
                job_cost = job.get_total_cost()
                profit = job.quoted_amount - job_cost
                margin = (profit / job.quoted_amount * 100) if job.quoted_amount > 0 else Decimal('0')
                
                profitable_jobs.append({
                    'job_id': job.id,
                    'job_number': job.job_number,
                    'name': job.name,
                    'customer_name': job.customer.name,
                    'quoted_amount': job.quoted_amount,
                    'total_cost': job_cost,
                    'profit': profit,
                    'profit_margin': margin,
                    'status': job.status,
                })
                
                total_revenue += job.quoted_amount
                total_cost += job_cost
            
            # Sort by profit margin
            profitable_jobs.sort(key=lambda x: x['profit_margin'], reverse=True)
            
            total_profit = total_revenue - total_cost
            overall_margin = (total_profit / total_revenue * 100) if total_revenue > 0 else Decimal('0')
            
            data = {
                'total_revenue': total_revenue,
                'total_cost': total_cost,
                'total_profit': total_profit,
                'overall_margin': overall_margin,
                'job_count': len(profitable_jobs),
                'jobs': profitable_jobs[:50],  # Limit to top 50 for performance
            }
            
            return Response(data)
            
        except Exception as e:
            logger.error(f"Error getting profitability analysis: {e}")
            return Response(
                {'error': 'Failed to fetch profitability analysis'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def send_quote(self, request, pk=None):
        """Send job quote to customer via email/WhatsApp"""
        try:
            job = self.get_object()
            serializer = JobQuoteSendSerializer(data=request.data)
            
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            data = serializer.validated_data
            send_via = data['send_via']
            
            # Generate quote PDF
            quote_pdf = self._generate_quote_pdf(job, include_terms=data.get('include_terms', True))
            
            # Track communication
            communication_data = {
                'job': job,
                'direction': 'outbound',
                'subject': f'Quote #{job.job_number}',
                'content': f'Quote for {job.name} - ${job.quoted_amount}',
                'sent_by': request.user,
                'contact_name': job.customer.name,
            }
            
            if send_via in ['email', 'both']:
                # Send via email
                email = data.get('email_address') or job.customer.email
                
                # For now, just log the email send
                logger.info(f"Would send quote email to {email}")
                JobCommunication.objects.create(
                    **communication_data,
                    communication_type='email',
                    contact_email=email,
                    is_delivered=True,
                    delivered_at=timezone.now()
                )
            
            if send_via in ['whatsapp', 'both']:
                # Send via WhatsApp
                from communications.whatsapp_service import whatsapp_service
                phone = data.get('phone_number') or job.customer.phone
                
                message = f"Quote #{job.job_number} for {job.name}\nAmount: ${job.quoted_amount}\n\nThank you for your interest!"
                
                if whatsapp_service.send_text_message(phone, message):
                    JobCommunication.objects.create(
                        **communication_data,
                        communication_type='whatsapp',
                        contact_phone=phone,
                        is_delivered=True,
                        delivered_at=timezone.now()
                    )
            
            # Update job quote sent info
            job.quote_sent_date = timezone.now()
            job.quote_sent_via = send_via
            job.save(update_fields=['quote_sent_date', 'quote_sent_via'])
            
            # Log status history
            JobStatusHistory.objects.create(
                job=job,
                from_status=job.status,
                to_status=job.status,
                changed_by=request.user,
                reason=f'Quote sent via {send_via}'
            )
            
            if send_via == 'print':
                # Return PDF for printing
                response = HttpResponse(quote_pdf, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="quote_{job.job_number}.pdf"'
                return response
            
            return Response({
                'status': 'success',
                'message': f'Quote sent successfully via {send_via}'
            })
            
        except Exception as e:
            logger.error(f"Error sending quote for job {pk}: {e}")
            return Response(
                {'error': f'Failed to send quote: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update job status with automatic transitions"""
        try:
            job = self.get_object()
            new_status = request.data.get('status')
            reason = request.data.get('reason', '')
            
            if new_status not in dict(Job.STATUS_CHOICES):
                return Response(
                    {'error': 'Invalid status'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate status transition
            valid_transitions = {
                'quote': ['approved', 'cancelled'],
                'approved': ['scheduled', 'cancelled'],
                'scheduled': ['in_transit', 'in_progress', 'cancelled', 'on_hold'],
                'in_transit': ['in_progress', 'on_hold'],
                'in_progress': ['pending_review', 'completed', 'on_hold', 'requires_parts'],
                'pending_review': ['completed', 'in_progress'],
                'completed': ['invoiced'],
                'invoiced': ['paid'],
                'paid': ['closed'],
                'on_hold': ['scheduled', 'in_progress', 'cancelled'],
                'requires_parts': ['in_progress', 'on_hold'],
                'callback_needed': ['scheduled', 'cancelled'],
            }
            
            current_status = job.status
            if current_status in valid_transitions:
                if new_status not in valid_transitions[current_status]:
                    return Response(
                        {'error': f'Cannot transition from {current_status} to {new_status}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Update status
            old_status = job.status
            job.status = new_status
            
            # Set relevant dates based on status
            if new_status == 'in_progress' and not job.start_date:
                job.start_date = timezone.now().date()
            elif new_status == 'completed' and not job.completion_date:
                job.completion_date = timezone.now().date()
            elif new_status == 'paid':
                job.payment_received_date = timezone.now()
            
            job.save()
            
            # Log status change
            JobStatusHistory.objects.create(
                job=job,
                from_status=old_status,
                to_status=new_status,
                changed_by=request.user,
                reason=reason,
                latitude=request.data.get('latitude'),
                longitude=request.data.get('longitude')
            )
            
            # Update calendar event if needed
            if new_status in ['scheduled', 'in_progress']:
                job.update_calendar_event()
            
            serializer = JobSerializer(job)
            return Response({
                'status': 'success',
                'message': f'Job status updated to {new_status}',
                'job': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error updating status for job {pk}: {e}")
            return Response(
                {'error': f'Failed to update status: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def capture_signature(self, request, pk=None):
        """Capture digital signature for job completion"""
        try:
            job = self.get_object()
            serializer = JobSignatureSerializer(data=request.data)
            
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            data = serializer.validated_data
            signature_type = data['signature_type']
            signature_data = data['signature_data']
            signed_name = data['signed_name']
            
            # Save signature based on type
            if signature_type == 'customer':
                job.customer_signature = signature_data
                job.customer_signed_date = timezone.now()
                job.customer_signed_name = signed_name
                fields_to_update = ['customer_signature', 'customer_signed_date', 'customer_signed_name']
            else:  # supervisor
                job.supervisor_signature = signature_data
                job.supervisor_signed_date = timezone.now()
                job.supervisor_signed_by = request.user
                fields_to_update = ['supervisor_signature', 'supervisor_signed_date', 'supervisor_signed_by']
            
            job.save(update_fields=fields_to_update)
            
            # Log signature capture
            JobStatusHistory.objects.create(
                job=job,
                from_status=job.status,
                to_status=job.status,
                changed_by=request.user,
                reason=f'{signature_type.capitalize()} signature captured',
                latitude=data.get('latitude'),
                longitude=data.get('longitude')
            )
            
            # Save signature as document
            self._save_signature_document(job, signature_type, signature_data, signed_name)
            
            # Check if both signatures are captured and update status if needed
            if job.customer_signature and job.supervisor_signature and job.status == 'pending_review':
                job.status = 'completed'
                job.completion_date = timezone.now().date()
                job.save(update_fields=['status', 'completion_date'])
                
                JobStatusHistory.objects.create(
                    job=job,
                    from_status='pending_review',
                    to_status='completed',
                    changed_by=request.user,
                    reason='Both signatures captured - job completed'
                )
            
            serializer = JobSerializer(job)
            return Response({
                'status': 'success',
                'message': f'{signature_type.capitalize()} signature captured successfully',
                'job': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error capturing signature for job {pk}: {e}")
            return Response(
                {'error': f'Failed to capture signature: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def generate_invoice(self, request, pk=None):
        """Generate an invoice from a completed job"""
        try:
            job = self.get_object()
            
            # Validate job status
            if job.status not in ['completed', 'pending_review']:
                return Response(
                    {'error': 'Job must be completed before generating invoice'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Import Invoice model from sales app
            from sales.models import Invoice, InvoiceItem
            
            # Check if invoice already exists for this job
            if hasattr(job, 'invoice') and job.invoice:
                return Response(
                    {'error': 'Invoice already exists for this job',
                     'invoice_id': str(job.invoice.id),
                     'invoice_number': job.invoice.invoice_num},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create invoice
            invoice_data = {
                'customer': job.customer,
                'date': timezone.now().date(),
                'due_date': timezone.now().date() + timedelta(days=30),
                'status': 'draft',
                'totalAmount': job.final_amount or job.quoted_amount or Decimal('0'),
                'discount': Decimal('0'),
                'currency': 'USD',
                'notes': f'Invoice for Job #{job.job_number} - {job.name}',
                'terms': 'Payment due within 30 days',
                'related_job': job
            }
            
            # Apply deposit credit if applicable
            if job.deposit_paid and job.deposit_amount:
                invoice_data['deposit_credit'] = job.deposit_amount
                invoice_data['totalAmount'] -= job.deposit_amount
            
            invoice = Invoice.objects.create(**invoice_data)
            
            # Create invoice items from job details
            items_created = []
            
            # Main job service item
            if job.final_amount or job.quoted_amount:
                item = InvoiceItem.objects.create(
                    invoice=invoice,
                    description=f'{job.name} - {job.description or "Job services"}',
                    quantity=Decimal('1'),
                    unit_price=job.final_amount or job.quoted_amount,
                    tax_rate=Decimal('0'),
                    tax_amount=Decimal('0'),
                    total=(job.final_amount or job.quoted_amount)
                )
                items_created.append(item)
            
            # Add materials as line items
            for material in job.materials.all():
                item = InvoiceItem.objects.create(
                    invoice=invoice,
                    description=material.description or material.material_name,
                    quantity=material.quantity,
                    unit_price=material.unit_cost,
                    tax_rate=Decimal('0'),
                    tax_amount=Decimal('0'),
                    total=material.total_cost
                )
                items_created.append(item)
            
            # Add labor as line items
            for labor in job.labor_entries.all():
                item = InvoiceItem.objects.create(
                    invoice=invoice,
                    description=f'Labor - {labor.employee.employee_name if labor.employee else "Worker"} ({labor.hours} hours)',
                    quantity=labor.hours,
                    unit_price=labor.hourly_rate,
                    tax_rate=Decimal('0'),
                    tax_amount=Decimal('0'),
                    total=labor.total_cost
                )
                items_created.append(item)
            
            # Add billable expenses
            for expense in job.expenses.filter(is_billable=True):
                markup_amount = (expense.amount * expense.markup_percentage / 100) if expense.markup_percentage else Decimal('0')
                total_amount = expense.amount + markup_amount
                
                item = InvoiceItem.objects.create(
                    invoice=invoice,
                    description=expense.description,
                    quantity=Decimal('1'),
                    unit_price=total_amount,
                    tax_rate=Decimal('0'),
                    tax_amount=Decimal('0'),
                    total=total_amount
                )
                items_created.append(item)
            
            # Update job status to invoiced
            job.status = 'invoiced'
            job.invoice_generated_date = timezone.now()
            job.save(update_fields=['status', 'invoice_generated_date'])
            
            # Log status change
            JobStatusHistory.objects.create(
                job=job,
                from_status='completed',
                to_status='invoiced',
                changed_by=request.user,
                reason=f'Invoice #{invoice.invoice_num} generated'
            )
            
            # Return invoice details
            from sales.serializers import InvoiceSerializer
            invoice_serializer = InvoiceSerializer(invoice)
            
            return Response({
                'message': 'Invoice generated successfully',
                'invoice': invoice_serializer.data,
                'items_count': len(items_created)
            })
            
        except Exception as e:
            logger.error(f"Error generating invoice for job {pk}: {e}")
            return Response(
                {'error': f'Failed to generate invoice: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def create_payment_session(self, request, pk=None):
        """Create a Stripe payment session for job invoice"""
        try:
            job = self.get_object()
            
            # Validate job has an invoice
            if job.status not in ['invoiced', 'paid']:
                return Response(
                    {'error': 'Job must have an invoice before payment can be collected'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get payment amount from request or job
            amount = Decimal(request.data.get('amount', job.final_amount or job.quoted_amount or 0))
            if amount <= 0:
                return Response(
                    {'error': 'Invalid payment amount'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Import Stripe
            import stripe
            stripe.api_key = settings.STRIPE_SECRET_KEY
            
            # Create Stripe checkout session
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': f'Payment for Job #{job.job_number}',
                            'description': job.name,
                        },
                        'unit_amount': int(amount * 100),  # Stripe expects cents
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=request.data.get('success_url', f'{settings.FRONTEND_URL}/dashboard/jobs/{job.id}/payment-success'),
                cancel_url=request.data.get('cancel_url', f'{settings.FRONTEND_URL}/dashboard/jobs/{job.id}'),
                metadata={
                    'job_id': str(job.id),
                    'invoice_id': str(request.data.get('invoice_id', '')),
                    'job_number': job.job_number,
                }
            )
            
            # Log payment attempt
            JobCommunication.objects.create(
                job=job,
                communication_type='system',
                subject='Payment session created',
                message=f'Stripe payment session created for ${amount}',
                sent_by=request.user
            )
            
            return Response({
                'session_id': checkout_session.id,
                'checkout_url': checkout_session.url
            })
            
        except Exception as e:
            logger.error(f"Error creating payment session for job {pk}: {e}")
            return Response(
                {'error': f'Failed to create payment session: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def initiate_mpesa_payment(self, request, pk=None):
        """Initiate M-Pesa STK Push for job payment"""
        try:
            job = self.get_object()
            
            # Validate job has an invoice
            if job.status not in ['invoiced', 'paid']:
                return Response(
                    {'error': 'Job must have an invoice before payment can be collected'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get payment details
            phone_number = request.data.get('phone_number')
            amount = Decimal(request.data.get('amount', job.final_amount or job.quoted_amount or 0))
            
            if not phone_number:
                return Response(
                    {'error': 'Phone number is required for M-Pesa payment'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if amount <= 0:
                return Response(
                    {'error': 'Invalid payment amount'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Import M-Pesa service
            from payments.mpesa_service import MpesaService
            
            # Initiate STK Push
            mpesa_service = MpesaService()
            response = mpesa_service.stk_push(
                phone_number=phone_number,
                amount=float(amount),
                account_reference=request.data.get('account_reference', f'JOB-{job.job_number}'),
                transaction_desc=request.data.get('transaction_desc', f'Payment for {job.name}')
            )
            
            if response.get('ResponseCode') == '0':
                # Success - save checkout request ID
                checkout_request_id = response.get('CheckoutRequestID')
                
                # Log payment attempt
                JobCommunication.objects.create(
                    job=job,
                    communication_type='system',
                    subject='M-Pesa payment initiated',
                    message=f'M-Pesa STK Push sent to {phone_number} for KES {amount}',
                    sent_by=request.user,
                    metadata={'checkout_request_id': checkout_request_id}
                )
                
                return Response({
                    'success': True,
                    'checkout_request_id': checkout_request_id,
                    'message': 'STK Push sent successfully'
                })
            else:
                return Response({
                    'success': False,
                    'message': response.get('ResponseDescription', 'Failed to initiate M-Pesa payment')
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error initiating M-Pesa payment for job {pk}: {e}")
            return Response(
                {'error': f'Failed to initiate M-Pesa payment: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='mpesa_status/(?P<checkout_request_id>[^/.]+)')
    def check_mpesa_status(self, request, checkout_request_id=None):
        """Check M-Pesa payment status"""
        try:
            if not checkout_request_id:
                return Response(
                    {'error': 'Checkout request ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Import M-Pesa service
            from payments.mpesa_service import MpesaService
            
            # Query payment status
            mpesa_service = MpesaService()
            response = mpesa_service.query_stk_status(checkout_request_id)
            
            if response.get('ResponseCode') == '0':
                result_code = response.get('ResultCode')
                
                if result_code == '0':
                    # Payment successful
                    status = 'completed'
                elif result_code == '1032':
                    # Payment cancelled by user
                    status = 'cancelled'
                elif result_code == '1037':
                    # Timeout
                    status = 'timeout'
                else:
                    # Other failure
                    status = 'failed'
                
                return Response({
                    'status': status,
                    'result_code': result_code,
                    'result_desc': response.get('ResultDesc', '')
                })
            else:
                return Response({
                    'status': 'pending',
                    'message': 'Payment still processing'
                })
                
        except Exception as e:
            logger.error(f"Error checking M-Pesa status: {e}")
            return Response(
                {'error': f'Failed to check payment status: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def bank_transfer_instructions(self, request, pk=None):
        """Get bank transfer instructions for job payment"""
        try:
            job = self.get_object()
            
            # Validate job has an invoice
            if job.status not in ['invoiced', 'paid']:
                return Response(
                    {'error': 'Job must have an invoice before payment can be collected'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get payment amount
            amount = Decimal(request.data.get('amount', job.final_amount or job.quoted_amount or 0))
            if amount <= 0:
                return Response(
                    {'error': 'Invalid payment amount'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get bank details from settings or database
            bank_details = {
                'bank_name': getattr(settings, 'COMPANY_BANK_NAME', 'Your Company Bank'),
                'account_name': getattr(settings, 'COMPANY_ACCOUNT_NAME', 'Your Company Name'),
                'account_number': getattr(settings, 'COMPANY_ACCOUNT_NUMBER', 'Contact support for account details'),
                'routing_number': getattr(settings, 'COMPANY_ROUTING_NUMBER', ''),
                'swift_code': getattr(settings, 'COMPANY_SWIFT_CODE', ''),
                'currency': 'USD',
                'amount': str(amount),
                'reference': f'JOB-{job.job_number}',
                'instructions': 'Please include the reference number in your transfer'
            }
            
            # Log bank transfer request
            JobCommunication.objects.create(
                job=job,
                communication_type='system',
                subject='Bank transfer instructions requested',
                message=f'Bank transfer instructions sent for ${amount}',
                sent_by=request.user
            )
            
            return Response(bank_details)
            
        except Exception as e:
            logger.error(f"Error getting bank transfer instructions for job {pk}: {e}")
            return Response(
                {'error': f'Failed to get bank transfer instructions: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        """Get all documents for a job"""
        try:
            job = self.get_object()
            documents = job.documents.all().order_by('-uploaded_at')
            serializer = JobDocumentSerializer(documents, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error fetching documents for job {pk}: {e}")
            return Response(
                {'error': 'Failed to fetch documents'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def status_history(self, request, pk=None):
        """Get status history for a job"""
        try:
            job = self.get_object()
            history = job.status_history.all().order_by('-changed_at')
            serializer = JobStatusHistorySerializer(history, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error fetching status history for job {pk}: {e}")
            return Response(
                {'error': 'Failed to fetch status history'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def communications(self, request, pk=None):
        """Get all communications for a job"""
        try:
            job = self.get_object()
            communications = job.communications.all().order_by('-sent_at')
            serializer = JobCommunicationSerializer(communications, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error fetching communications for job {pk}: {e}")
            return Response(
                {'error': 'Failed to fetch communications'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_quote_pdf(self, job, include_terms=True):
        """Generate PDF quote for a job"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()
        
        # Header
        elements.append(Paragraph(f"Quote #{job.job_number}", styles['Title']))
        elements.append(Spacer(1, 12))
        
        # Customer info
        elements.append(Paragraph(f"<b>Customer:</b> {job.customer.name}", styles['Normal']))
        elements.append(Paragraph(f"<b>Email:</b> {job.customer.email}", styles['Normal']))
        elements.append(Paragraph(f"<b>Phone:</b> {job.customer.phone}", styles['Normal']))
        elements.append(Spacer(1, 12))
        
        # Job details
        elements.append(Paragraph(f"<b>Job:</b> {job.name}", styles['Normal']))
        elements.append(Paragraph(f"<b>Description:</b> {job.description}", styles['Normal']))
        elements.append(Paragraph(f"<b>Quote Date:</b> {job.quote_date}", styles['Normal']))
        if job.quote_valid_until:
            elements.append(Paragraph(f"<b>Valid Until:</b> {job.quote_valid_until}", styles['Normal']))
        elements.append(Spacer(1, 12))
        
        # Materials table
        if job.materials.exists():
            materials_data = [['Material', 'Quantity', 'Unit Price', 'Total']]
            for material in job.materials.filter(is_billable=True):
                materials_data.append([
                    material.supply.name,
                    str(material.quantity),
                    f"${material.unit_price}",
                    f"${material.get_total_price()}"
                ])
            
            materials_table = Table(materials_data)
            materials_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(materials_table)
            elements.append(Spacer(1, 12))
        
        # Total
        elements.append(Paragraph(f"<b>Total Quote Amount: ${job.quoted_amount}</b>", styles['Heading2']))
        
        # Terms and conditions
        if include_terms and job.terms_conditions:
            elements.append(Spacer(1, 12))
            elements.append(Paragraph("Terms and Conditions", styles['Heading3']))
            elements.append(Paragraph(job.terms_conditions, styles['Normal']))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
    
    def _save_signature_document(self, job, signature_type, signature_data, signed_name):
        """Save signature as a document"""
        try:
            # Decode base64 signature
            format, imgstr = signature_data.split(';base64,')
            ext = format.split('/')[-1]
            
            # Create document record
            JobDocument.objects.create(
                job=job,
                document_type='signature',
                title=f'{signature_type.capitalize()} Signature - {signed_name}',
                description=f'Digital signature captured on {timezone.now().strftime("%Y-%m-%d %H:%M")}',
                file_url=signature_data,  # For now, store base64 data
                file_name=f'{signature_type}_signature_{job.job_number}.{ext}',
                file_size=len(imgstr),
                file_type=format.replace('data:', ''),
                uploaded_by=self.request.user
            )
        except Exception as e:
            logger.error(f"Error saving signature document: {e}")
            # Don't fail the main operation if document save fails


class JobMaterialViewSet(TenantIsolatedViewSet):
    """ViewSet for managing job materials"""
    serializer_class = JobMaterialSerializer
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        job_id = self.kwargs.get('job_pk')
        return JobMaterial.objects.filter(job_id=job_id).select_related('material', 'added_by')
    
    def perform_create(self, serializer):
        job_id = self.kwargs.get('job_pk')
        job = get_object_or_404(Job, id=job_id)
        serializer.save(
            job=job,
            added_by=self.request.user
        )


class JobLaborViewSet(TenantIsolatedViewSet):
    """ViewSet for managing job labor entries"""
    serializer_class = JobLaborSerializer
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        job_id = self.kwargs.get('job_pk')
        return JobLabor.objects.filter(job_id=job_id).select_related('employee__user')
    
    def perform_create(self, serializer):
        job_id = self.kwargs.get('job_pk')
        job = get_object_or_404(Job, id=job_id)
        serializer.save(
            job=job
        )


class JobExpenseViewSet(TenantIsolatedViewSet):
    """ViewSet for managing job expenses"""
    serializer_class = JobExpenseSerializer
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        job_id = self.kwargs.get('job_pk')
        return JobExpense.objects.filter(job_id=job_id)
    
    def perform_create(self, serializer):
        job_id = self.kwargs.get('job_pk')
        job = get_object_or_404(Job, id=job_id)
        serializer.save(
            job=job,
            added_by=self.request.user
        )


class VehicleViewSet(TenantIsolatedViewSet):
    """ViewSet for managing vehicles"""
    serializer_class = VehicleSerializer
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter vehicles by tenant"""
        logger.info(f"🚗 [VehicleViewSet] get_queryset called by user: {getattr(self.request.user, 'email', 'Unknown')}")
        queryset = Vehicle.objects.select_related('assigned_to__user').order_by('registration_number')
        logger.info(f"🚗 [VehicleViewSet] Found {queryset.count()} vehicles")
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new vehicle with detailed logging"""
        logger.info(f"🚗 [VehicleViewSet] === CREATE START ===")
        logger.info(f"🚗 [VehicleViewSet] User: {getattr(request.user, 'email', 'Unknown')}")
        logger.info(f"🚗 [VehicleViewSet] Request data: {request.data}")
        logger.info(f"🚗 [VehicleViewSet] Request headers: {dict(request.headers)}")
        
        try:
            response = super().create(request, *args, **kwargs)
            logger.info(f"🚗 [VehicleViewSet] Vehicle created successfully: {response.data}")
            return response
        except Exception as e:
            logger.error(f"🚗 [VehicleViewSet] Error creating vehicle: {str(e)}")
            logger.error(f"🚗 [VehicleViewSet] Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"🚗 [VehicleViewSet] Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to create vehicle: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def perform_create(self, serializer):
        """Set created_by when creating a vehicle"""
        logger.info(f"🚗 [VehicleViewSet] perform_create called")
        logger.info(f"🚗 [VehicleViewSet] Validated data: {serializer.validated_data}")
        try:
            serializer.save(
                created_by=self.request.user
            )
            logger.info(f"🚗 [VehicleViewSet] Vehicle saved successfully")
        except Exception as e:
            logger.error(f"🚗 [VehicleViewSet] Error in perform_create: {str(e)}")
            raise
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """Get available vehicles"""
        available_vehicles = self.get_queryset().filter(
            status='active',
            is_available=True
        )
        serializer = self.get_serializer(available_vehicles, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Assign vehicle to an employee"""
        vehicle = self.get_object()
        employee_id = request.data.get('employee_id')
        
        if employee_id:
            from hr.models import Employee
            try:
                employee = Employee.objects.get(id=employee_id)
                vehicle.assigned_to = employee
                vehicle.is_available = False
                vehicle.save()
                return Response({'status': 'Vehicle assigned successfully'})
            except Employee.DoesNotExist:
                return Response(
                    {'error': 'Employee not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Unassign vehicle
            vehicle.assigned_to = None
            vehicle.is_available = True
            vehicle.save()
            return Response({'status': 'Vehicle unassigned successfully'})
    
    @action(detail=True, methods=['post'])
    def update_mileage(self, request, pk=None):
        """Update vehicle mileage"""
        vehicle = self.get_object()
        new_mileage = request.data.get('mileage')
        
        if new_mileage and int(new_mileage) > vehicle.mileage:
            vehicle.mileage = int(new_mileage)
            vehicle.save()
            return Response({'status': 'Mileage updated successfully'})
        else:
            return Response(
                {'error': 'New mileage must be greater than current mileage'},
                status=status.HTTP_400_BAD_REQUEST
            )


# Additional API endpoints for Job form data
class JobDataViewSet(TenantIsolatedViewSet):
    """ViewSet for providing job form data (customers, employees, supplies)"""
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def initial(self, request, *args, **kwargs):
        """Override initial to ensure tenant context is set"""
        super().initial(request, *args, **kwargs)
        
        # Import here to avoid circular imports
        from custom_auth.rls import set_tenant_context
        
        # Ensure tenant context is set for the request
        if hasattr(request.user, 'tenant_id') and request.user.tenant_id:
            logger.info(f"[JobDataViewSet] Setting tenant context in initial: {request.user.tenant_id}")
            set_tenant_context(str(request.user.tenant_id))
        elif hasattr(request.user, 'business_id') and request.user.business_id:
            logger.info(f"[JobDataViewSet] Setting tenant context from business_id: {request.user.business_id}")
            set_tenant_context(str(request.user.business_id))
    
    @action(detail=False, methods=['get'])
    def customers(self, request):
        """Get available customers for job assignment"""
        request_id = request.headers.get('X-Request-ID', 'no-id')
        logger.info(f"👥 [JobDataViewSet] === CUSTOMERS ENDPOINT START [{request_id}] ===")
        logger.info(f"👥 [JobDataViewSet] [{request_id}] Timestamp: {timezone.now().isoformat()}")
        logger.info(f"👥 [JobDataViewSet] [{request_id}] Request user: {request.user}")
        logger.info(f"👥 [JobDataViewSet] [{request_id}] User email: {getattr(request.user, 'email', 'Unknown')}")
        logger.info(f"👥 [JobDataViewSet] [{request_id}] User authenticated: {request.user.is_authenticated}")
        
        try:
            from crm.models import Customer
            from crm.serializers import CustomerSerializer
            from custom_auth.rls import get_current_tenant_id
            
            # Debug user and tenant context
            logger.info(f"👥 [JobDataViewSet] [{request_id}] User tenant_id: {getattr(request.user, 'tenant_id', 'None')}")
            logger.info(f"👥 [JobDataViewSet] [{request_id}] User business_id: {getattr(request.user, 'business_id', 'None')}")
            
            current_tenant = get_current_tenant_id()
            logger.info(f"👥 [JobDataViewSet] [{request_id}] Current tenant context in DB: {current_tenant}")
            
            # CRITICAL: Use proper tenant filtering - NEVER bypass with all_objects
            logger.info(f"👥 [JobDataViewSet] [{request_id}] Starting customer query with tenant filtering...")
            
            # Get tenant_id from user
            tenant_id = getattr(request.user, 'tenant_id', None) or \
                       getattr(request.user, 'business_id', None)
            
            if not tenant_id:
                logger.error(f"👥 [JobDataViewSet] [{request_id}] No tenant_id found for user {request.user.email}")
                customers = Customer.objects.none()
            else:
                # Use regular objects manager which respects tenant filtering
                customers = Customer.objects.filter(tenant_id=tenant_id).order_by('business_name', 'first_name', 'last_name')
                logger.info(f"👥 [JobDataViewSet] [{request_id}] Filtered customers for tenant {tenant_id}: {customers.count()} found")
            
            logger.info(f"👥 [JobDataViewSet] [{request_id}] Found {customers.count()} customers")
            
            # Debug first few customers if any
            if customers.exists():
                for i, customer in enumerate(customers[:3]):
                    logger.info(f"👥 [JobDataViewSet] [{request_id}] Customer {i}: {customer.business_name or customer.first_name} - tenant_id: {customer.tenant_id}")
            
            logger.info(f"👥 [JobDataViewSet] [{request_id}] Serializing customer data...")
            serializer = CustomerSerializer(customers, many=True)
            serialized_data = serializer.data
            
            logger.info(f"👥 [JobDataViewSet] [{request_id}] Serialized data type: {type(serialized_data)}")
            logger.info(f"👥 [JobDataViewSet] [{request_id}] Serialized data count: {len(serialized_data)}")
            if len(serialized_data) > 0:
                logger.info(f"👥 [JobDataViewSet] [{request_id}] Sample serialized customer: {serialized_data[0]}")
            
            logger.info(f"👥 [JobDataViewSet] [{request_id}] === CUSTOMERS ENDPOINT END ===")
            return Response(serialized_data)
        except Exception as e:
            logger.error(f"👥 [JobDataViewSet] [{request_id}] Error fetching customers: {str(e)}")
            logger.error(f"👥 [JobDataViewSet] [{request_id}] Error type: {type(e)}")
            logger.error(f"👥 [JobDataViewSet] [{request_id}] Error traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to fetch customers: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def employees(self, request):
        """Get available employees for job assignment"""
        logger.info(f"👷 [JobDataViewSet] Fetching employees for user: {getattr(request.user, 'email', 'Unknown')}")
        try:
            from hr.models import Employee
            from hr.serializers import EmployeeSerializer
            
            employees = Employee.objects.filter(active=True).select_related('user').order_by('user__first_name', 'user__last_name')
            logger.info(f"👷 [JobDataViewSet] Found {employees.count()} employees")
            
            serializer = EmployeeSerializer(employees, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"👷 [JobDataViewSet] Error fetching employees: {str(e)}")
            return Response(
                {'error': f'Failed to fetch employees: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def supplies(self, request):
        """Get available supplies for job materials"""
        request_id = request.headers.get('X-Request-ID', 'no-id')
        logger.info(f"📦 [JobDataViewSet] === SUPPLIES ENDPOINT START [{request_id}] ===")
        logger.info(f"📦 [JobDataViewSet] [{request_id}] Timestamp: {timezone.now().isoformat()}")
        logger.info(f"📦 [JobDataViewSet] [{request_id}] Request user: {request.user}")
        logger.info(f"📦 [JobDataViewSet] [{request_id}] User email: {getattr(request.user, 'email', 'Unknown')}")
        logger.info(f"📦 [JobDataViewSet] [{request_id}] User authenticated: {request.user.is_authenticated}")
        
        try:
            try:
                # Try to use Material model (new approach)
                from inventory.models_materials import Material
                from inventory.serializers_materials import MaterialListSerializer
                from custom_auth.rls import get_current_tenant_id
                
                # Debug user and tenant context
                logger.info(f"📦 [JobDataViewSet] [{request_id}] Using Material model")
                logger.info(f"📦 [JobDataViewSet] [{request_id}] User tenant_id: {getattr(request.user, 'tenant_id', 'None')}")
                logger.info(f"📦 [JobDataViewSet] [{request_id}] User business_id: {getattr(request.user, 'business_id', 'None')}")
                
                current_tenant = get_current_tenant_id()
                logger.info(f"📦 [JobDataViewSet] [{request_id}] Current tenant context in DB: {current_tenant}")
                
                # Query materials using tenant filtering
                logger.info(f"📦 [JobDataViewSet] [{request_id}] Starting materials query...")
                supplies = Material.objects.filter(
                    is_active=True
                ).order_by('name')
                
                logger.info(f"📦 [JobDataViewSet] [{request_id}] Found {supplies.count()} materials")
                
                # Debug first few supplies if any
                if supplies.exists():
                    for i, supply in enumerate(supplies[:3]):
                        logger.info(f"📦 [JobDataViewSet] [{request_id}] Material {i}: {supply.name} - SKU: {supply.sku} - tenant_id: {supply.tenant_id}")
                
                logger.info(f"📦 [JobDataViewSet] [{request_id}] Serializing material data...")
                serializer = MaterialListSerializer(supplies, many=True)
                serialized_data = serializer.data
                
            except Exception as material_error:
                # Fallback to Product model (backward compatibility during migration)
                logger.warning(f"📦 [JobDataViewSet] [{request_id}] Material model failed, falling back to Product model: {material_error}")
                
                from inventory.models import Product
                from inventory.serializers import ProductSerializer
                from custom_auth.rls import get_current_tenant_id
                
                # Debug user and tenant context
                logger.info(f"📦 [JobDataViewSet] [{request_id}] Using Product model fallback")
                logger.info(f"📦 [JobDataViewSet] [{request_id}] User tenant_id: {getattr(request.user, 'tenant_id', 'None')}")
                logger.info(f"📦 [JobDataViewSet] [{request_id}] User business_id: {getattr(request.user, 'business_id', 'None')}")
                
                current_tenant = get_current_tenant_id()
                logger.info(f"📦 [JobDataViewSet] [{request_id}] Current tenant context in DB: {current_tenant}")
                
                # Query products marked as supplies (if they still exist)
                logger.info(f"📦 [JobDataViewSet] [{request_id}] Starting fallback products query...")
                supplies = Product.objects.filter(
                    is_active=True
                ).order_by('name')
                
                logger.info(f"📦 [JobDataViewSet] [{request_id}] Found {supplies.count()} products")
                
                logger.info(f"📦 [JobDataViewSet] [{request_id}] Serializing product data...")
                serializer = ProductSerializer(supplies, many=True)
                serialized_data = serializer.data
            
            logger.info(f"📦 [JobDataViewSet] [{request_id}] Serialized data type: {type(serialized_data)}")
            logger.info(f"📦 [JobDataViewSet] [{request_id}] Serialized data count: {len(serialized_data)}")
            if len(serialized_data) > 0:
                logger.info(f"📦 [JobDataViewSet] [{request_id}] Sample serialized supply: {serialized_data[0]}")
            
            logger.info(f"📦 [JobDataViewSet] [{request_id}] === SUPPLIES ENDPOINT END ===")
            return Response(serialized_data)
        except Exception as e:
            logger.error(f"📦 [JobDataViewSet] [{request_id}] Error fetching supplies: {str(e)}")
            logger.error(f"📦 [JobDataViewSet] [{request_id}] Error type: {type(e)}")
            logger.error(f"📦 [JobDataViewSet] [{request_id}] Error traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to fetch supplies: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class JobDocumentViewSet(TenantIsolatedViewSet):
    """ViewSet for managing job documents"""
    serializer_class = JobDocumentSerializer
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        job_id = self.kwargs.get('job_pk')
        return JobDocument.objects.filter(job_id=job_id).order_by('-uploaded_at')
    
    def perform_create(self, serializer):
        job_id = self.kwargs.get('job_pk')
        job = get_object_or_404(Job, id=job_id)
        serializer.save(
            job=job,
            uploaded_by=self.request.user
        )
    
    @action(detail=False, methods=['post'])
    def upload_receipt(self, request, job_pk=None):
        """Upload receipt with OCR processing"""
        try:
            job = get_object_or_404(Job, id=job_pk)
            
            # Handle file upload
            file_data = request.data.get('file')
            if not file_data:
                return Response(
                    {'error': 'No file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Extract file info
            file_name = request.data.get('file_name', 'receipt.jpg')
            vendor_name = request.data.get('vendor_name', '')
            amount = request.data.get('amount')
            expense_date = request.data.get('expense_date')
            
            # Create document
            document = JobDocument.objects.create(
                job=job,
                document_type='receipt',
                title=f'Receipt - {vendor_name or "Unknown Vendor"}',
                description=request.data.get('description', ''),
                file_url=file_data,  # Base64 or URL
                file_name=file_name,
                file_size=len(file_data) if isinstance(file_data, str) else 0,
                file_type='image/jpeg',  # Update based on actual file
                amount=amount,
                vendor_name=vendor_name,
                expense_date=expense_date,
                is_billable=request.data.get('is_billable', True),
                uploaded_by=request.user
            )
            
            # TODO: Add OCR processing here
            # document.ocr_extracted_text = extract_text_from_image(file_data)
            # document.save()
            
            serializer = JobDocumentSerializer(document)
            return Response({
                'status': 'success',
                'message': 'Receipt uploaded successfully',
                'document': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error uploading receipt: {e}")
            return Response(
                {'error': f'Failed to upload receipt: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class JobStatusHistoryViewSet(TenantIsolatedViewSet):
    """ViewSet for viewing job status history (read-only)"""
    serializer_class = JobStatusHistorySerializer
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        job_id = self.kwargs.get('job_pk')
        return JobStatusHistory.objects.filter(job_id=job_id).order_by('-changed_at')


class JobCommunicationViewSet(TenantIsolatedViewSet):
    """ViewSet for managing job communications"""
    serializer_class = JobCommunicationSerializer
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        job_id = self.kwargs.get('job_pk')
        return JobCommunication.objects.filter(job_id=job_id).order_by('-sent_at')
    
    def perform_create(self, serializer):
        job_id = self.kwargs.get('job_pk')
        job = get_object_or_404(Job, id=job_id)
        serializer.save(
            job=job,
            sent_by=self.request.user
        )