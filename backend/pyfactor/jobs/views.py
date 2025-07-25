from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.utils import timezone
from django.db.models import Sum, F, Q, Prefetch
from django.shortcuts import get_object_or_404
from decimal import Decimal
import logging

from .models import Job, JobMaterial, JobLabor, JobExpense
from .serializers import (
    JobSerializer, JobDetailSerializer, JobMaterialSerializer, 
    JobLaborSerializer, JobExpenseSerializer, JobCostingSerializer
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
        return Job.objects.select_related('customer', 'assigned_to__user').prefetch_related(
            'materials__supply',
            'labor_entries__employee__user',
            'expenses'
        ).order_by('-created_at')
    
    def get_serializer_class(self):
        """Use detailed serializer for retrieve action"""
        if self.action == 'retrieve':
            return JobDetailSerializer
        return JobSerializer
    
    def perform_create(self, serializer):
        """Set created_by when creating a job"""
        serializer.save(
            created_by=self.request.user
        )
    
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