from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.utils import timezone
from django.db.models import Sum, F, Q, Prefetch
from django.shortcuts import get_object_or_404
from django.core.files.base import ContentFile
from django.http import HttpResponse
from decimal import Decimal
import logging
import json
import base64
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from datetime import datetime

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

class JobViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing jobs with full CRUD operations
    """
    serializer_class = JobSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter jobs by tenant"""
        return Job.objects.select_related('customer', 'lead_employee__user', 'vehicle').prefetch_related(
            'assigned_employees__user',
            'materials__supply',
            'labor_entries__employee__user',
            'expenses'
        ).order_by('-created_at')
    
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


class JobMaterialViewSet(viewsets.ModelViewSet):
    """ViewSet for managing job materials"""
    serializer_class = JobMaterialSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        job_id = self.kwargs.get('job_pk')
        return JobMaterial.objects.filter(job_id=job_id).select_related('supply', 'added_by')
    
    def perform_create(self, serializer):
        job_id = self.kwargs.get('job_pk')
        job = get_object_or_404(Job, id=job_id)
        serializer.save(
            job=job,
            added_by=self.request.user
        )


class JobLaborViewSet(viewsets.ModelViewSet):
    """ViewSet for managing job labor entries"""
    serializer_class = JobLaborSerializer
    authentication_classes = [JWTAuthentication]
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


class JobExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet for managing job expenses"""
    serializer_class = JobExpenseSerializer
    authentication_classes = [JWTAuthentication]
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


class VehicleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing vehicles"""
    serializer_class = VehicleSerializer
    authentication_classes = [JWTAuthentication]
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
class JobDataViewSet(viewsets.ViewSet):
    """ViewSet for providing job form data (customers, employees, supplies)"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def customers(self, request):
        """Get available customers for job assignment"""
        logger.info(f"👥 [JobDataViewSet] Fetching customers for user: {getattr(request.user, 'email', 'Unknown')}")
        try:
            from crm.models import Customer
            from crm.serializers import CustomerSerializer
            
            customers = Customer.objects.filter(is_active=True).order_by('name')
            logger.info(f"👥 [JobDataViewSet] Found {customers.count()} customers")
            
            serializer = CustomerSerializer(customers, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"👥 [JobDataViewSet] Error fetching customers: {str(e)}")
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
        logger.info(f"📦 [JobDataViewSet] Fetching supplies for user: {getattr(request.user, 'email', 'Unknown')}")
        try:
            from inventory.models import Product
            from inventory.serializers import ProductSerializer
            
            supplies = Product.objects.filter(
                inventory_type='supply',
                is_active=True
            ).order_by('name')
            logger.info(f"📦 [JobDataViewSet] Found {supplies.count()} supplies")
            
            serializer = ProductSerializer(supplies, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"📦 [JobDataViewSet] Error fetching supplies: {str(e)}")
            return Response(
                {'error': f'Failed to fetch supplies: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )