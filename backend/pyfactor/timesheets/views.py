from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum
from django.utils import timezone
from datetime import datetime, timedelta, date
from decimal import Decimal
from .models import Timesheet, TimeEntry, ClockEntry, TimeOffRequest, GeofenceZone
from .serializers import (
    TimesheetSerializer, TimeEntrySerializer, ClockEntrySerializer,
    TimeOffRequestSerializer, GeofenceZoneSerializer,
    TimesheetApprovalSerializer, TimeOffApprovalSerializer
)
from pyfactor.permissions import IsOwnerOrAdmin
from pyfactor.logging_config import get_logger

logger = get_logger()


class TimesheetViewSet(viewsets.ModelViewSet):
    """ViewSet for managing timesheets"""
    serializer_class = TimesheetSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Timesheet.objects.filter(business_id=user.business_id)
        
        # Filter by employee if specified
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by week
        week_starting = self.request.query_params.get('week_starting')
        if week_starting:
            queryset = queryset.filter(week_starting=week_starting)
        
        # For supervisors, show timesheets they need to approve
        if self.request.query_params.get('for_approval') == 'true':
            employee = getattr(user, 'employee', None)
            if employee:
                queryset = queryset.filter(
                    Q(supervisor=employee) | Q(employee__supervisor=employee),
                    status='submitted'
                )
        
        return queryset.select_related('employee', 'supervisor', 'approved_by')
    
    @action(detail=False, methods=['get'])
    def current_week(self, request):
        """Get or create timesheet for current week"""
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            # Default to current user's employee
            employee = getattr(request.user, 'employee', None)
            if not employee:
                return Response(
                    {'error': 'No employee record found for user'},
                    status=status.HTTP_404_NOT_FOUND
                )
            employee_id = employee.id
        
        # Calculate current week starting date (Monday)
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        
        # Get or create timesheet
        timesheet, created = Timesheet.objects.get_or_create(
            employee_id=employee_id,
            week_starting=week_start,
            defaults={
                'business_id': request.user.business_id,
                'week_ending': week_end,
                'supervisor_id': request.user.employee.supervisor_id if hasattr(request.user, 'employee') else None
            }
        )
        
        # If created, set initial rates from employee record
        if created and timesheet.employee.pay_type == 'hourly':
            timesheet.hourly_rate = timesheet.employee.hourly_rate
            timesheet.overtime_rate = timesheet.hourly_rate * Decimal('1.5')
            timesheet.save()
        
        serializer = self.get_serializer(timesheet)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit timesheet for approval"""
        timesheet = self.get_object()
        
        if timesheet.status != 'draft':
            return Response(
                {'error': 'Only draft timesheets can be submitted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        timesheet.status = 'submitted'
        timesheet.submitted_at = timezone.now()
        timesheet.save()
        
        serializer = self.get_serializer(timesheet)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], serializer_class=TimesheetApprovalSerializer)
    def approve(self, request, pk=None):
        """Approve or reject a timesheet"""
        timesheet = self.get_object()
        serializer = self.get_serializer(timesheet, data=request.data)
        
        if serializer.is_valid():
            # Check if user can approve
            employee = getattr(request.user, 'employee', None)
            if not employee:
                return Response(
                    {'error': 'No employee record found'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            can_approve = (
                employee == timesheet.supervisor or
                request.user.role in ['OWNER', 'ADMIN']
            )
            
            if not can_approve:
                return Response(
                    {'error': 'You do not have permission to approve this timesheet'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer.save()
            return Response(TimesheetSerializer(timesheet).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Get timesheets pending approval for current supervisor"""
        employee = getattr(request.user, 'employee', None)
        if not employee:
            return Response({'timesheets': []})
        
        # Get timesheets where user is supervisor or admin/owner
        if request.user.role in ['OWNER', 'ADMIN']:
            timesheets = Timesheet.objects.filter(
                business_id=request.user.business_id,
                status='submitted'
            )
        else:
            timesheets = Timesheet.objects.filter(
                Q(supervisor=employee) | Q(employee__supervisor=employee),
                status='submitted'
            )
        
        serializer = self.get_serializer(timesheets, many=True)
        return Response({'timesheets': serializer.data})


class TimeEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing time entries"""
    serializer_class = TimeEntrySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return TimeEntry.objects.filter(
            timesheet__business_id=self.request.user.business_id
        )
    
    def update(self, request, *args, **kwargs):
        """Update time entry and recalculate totals"""
        response = super().update(request, *args, **kwargs)
        
        # Trigger timesheet total recalculation
        instance = self.get_object()
        instance.timesheet.calculate_totals()
        
        return response
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Update multiple time entries at once"""
        entries_data = request.data.get('entries', [])
        
        updated_entries = []
        for entry_data in entries_data:
            entry_id = entry_data.get('id')
            if entry_id:
                try:
                    entry = TimeEntry.objects.get(
                        id=entry_id,
                        timesheet__business_id=request.user.business_id
                    )
                    serializer = self.get_serializer(entry, data=entry_data, partial=True)
                    if serializer.is_valid():
                        serializer.save()
                        updated_entries.append(serializer.data)
                except TimeEntry.DoesNotExist:
                    pass
        
        return Response({'entries': updated_entries})


class ClockEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for clock in/out entries"""
    serializer_class = ClockEntrySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = ClockEntry.objects.filter(
            business_id=self.request.user.business_id
        )
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(timestamp__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(timestamp__date__lte=date_to)
        
        return queryset.select_related('employee')
    
    @action(detail=False, methods=['get'])
    def current_status(self, request):
        """Get current clock status for employee"""
        employee = getattr(request.user, 'employee', None)
        if not employee:
            return Response({'error': 'No employee record found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get latest clock entry
        latest_entry = ClockEntry.objects.filter(
            employee=employee,
            timestamp__date=date.today()
        ).order_by('-timestamp').first()
        
        is_clocked_in = False
        is_on_break = False
        last_clock_in = None
        last_break_start = None
        
        if latest_entry:
            if latest_entry.entry_type == 'clock_in':
                is_clocked_in = True
                last_clock_in = latest_entry.timestamp
            elif latest_entry.entry_type == 'break_start':
                is_clocked_in = True
                is_on_break = True
                last_break_start = latest_entry.timestamp
                # Find last clock in
                clock_in = ClockEntry.objects.filter(
                    employee=employee,
                    timestamp__date=date.today(),
                    entry_type='clock_in'
                ).order_by('-timestamp').first()
                if clock_in:
                    last_clock_in = clock_in.timestamp
        
        # Calculate today's total hours
        today_entries = ClockEntry.objects.filter(
            employee=employee,
            timestamp__date=date.today()
        ).order_by('timestamp')
        
        total_hours = self.calculate_hours_from_entries(today_entries)
        
        return Response({
            'is_clocked_in': is_clocked_in,
            'is_on_break': is_on_break,
            'last_clock_in': last_clock_in,
            'last_break_start': last_break_start,
            'today_total_hours': total_hours,
            'latest_entry': ClockEntrySerializer(latest_entry).data if latest_entry else None
        })
    
    @action(detail=False, methods=['post'])
    def clock(self, request):
        """Clock in/out or start/end break"""
        entry_type = request.data.get('entry_type')
        
        if entry_type not in ['clock_in', 'clock_out', 'break_start', 'break_end']:
            return Response(
                {'error': 'Invalid entry type'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        employee = getattr(request.user, 'employee', None)
        if not employee:
            return Response(
                {'error': 'No employee record found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create clock entry
        data = request.data.copy()
        data['employee'] = employee.id
        
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            clock_entry = serializer.save()
            
            # If clocking out, update timesheet
            if entry_type == 'clock_out':
                self.update_timesheet_from_clock_entries(employee)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def calculate_hours_from_entries(self, entries):
        """Calculate total hours from clock entries"""
        total_seconds = 0
        clock_in_time = None
        break_start_time = None
        
        for entry in entries:
            if entry.entry_type == 'clock_in':
                clock_in_time = entry.timestamp
            elif entry.entry_type == 'clock_out' and clock_in_time:
                # Add work time
                duration = entry.timestamp - clock_in_time
                total_seconds += duration.total_seconds()
                clock_in_time = None
            elif entry.entry_type == 'break_start':
                break_start_time = entry.timestamp
            elif entry.entry_type == 'break_end' and break_start_time and clock_in_time:
                # Subtract break time
                break_duration = entry.timestamp - break_start_time
                total_seconds -= break_duration.total_seconds()
                break_start_time = None
        
        # If still clocked in, calculate up to now
        if clock_in_time and not break_start_time:
            duration = timezone.now() - clock_in_time
            total_seconds += duration.total_seconds()
        
        return round(total_seconds / 3600, 2)  # Convert to hours
    
    def update_timesheet_from_clock_entries(self, employee):
        """Update timesheet based on clock entries"""
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        
        # Get or create timesheet
        timesheet, _ = Timesheet.objects.get_or_create(
            employee=employee,
            week_starting=week_start,
            defaults={
                'business_id': employee.business_id,
                'week_ending': week_start + timedelta(days=6),
                'supervisor': employee.supervisor
            }
        )
        
        # Get today's entries
        entries = ClockEntry.objects.filter(
            employee=employee,
            timestamp__date=today
        ).order_by('timestamp')
        
        # Calculate hours
        total_hours = self.calculate_hours_from_entries(entries)
        
        # Update time entry
        time_entry, _ = TimeEntry.objects.get_or_create(
            timesheet=timesheet,
            date=today
        )
        
        # Simple logic: first 8 hours are regular, rest is overtime
        if total_hours <= 8:
            time_entry.regular_hours = Decimal(str(total_hours))
            time_entry.overtime_hours = 0
        else:
            time_entry.regular_hours = 8
            time_entry.overtime_hours = Decimal(str(total_hours - 8))
        
        time_entry.save()


class TimeOffRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for time off requests"""
    serializer_class = TimeOffRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = TimeOffRequest.objects.filter(business_id=user.business_id)
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # For supervisors, show requests they need to approve
        if self.request.query_params.get('for_approval') == 'true':
            employee = getattr(user, 'employee', None)
            if employee:
                if user.role in ['OWNER', 'ADMIN']:
                    queryset = queryset.filter(status='pending')
                else:
                    queryset = queryset.filter(
                        employee__supervisor=employee,
                        status='pending'
                    )
        
        return queryset.select_related('employee', 'reviewed_by')
    
    def perform_create(self, serializer):
        """Set employee when creating request"""
        employee = getattr(self.request.user, 'employee', None)
        if employee:
            serializer.save(employee=employee)
        else:
            raise serializers.ValidationError("No employee record found for user")
    
    @action(detail=True, methods=['post'], serializer_class=TimeOffApprovalSerializer)
    def review(self, request, pk=None):
        """Approve or reject time off request"""
        time_off_request = self.get_object()
        serializer = self.get_serializer(time_off_request, data=request.data)
        
        if serializer.is_valid():
            # Check if user can review
            employee = getattr(request.user, 'employee', None)
            if not employee:
                return Response(
                    {'error': 'No employee record found'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            can_review = (
                employee == time_off_request.employee.supervisor or
                request.user.role in ['OWNER', 'ADMIN']
            )
            
            if not can_review:
                return Response(
                    {'error': 'You do not have permission to review this request'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer.save()
            return Response(TimeOffRequestSerializer(time_off_request).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Get time off requests pending approval"""
        employee = getattr(request.user, 'employee', None)
        if not employee:
            return Response({'requests': []})
        
        # Get requests where user is supervisor or admin/owner
        if request.user.role in ['OWNER', 'ADMIN']:
            requests = TimeOffRequest.objects.filter(
                business_id=request.user.business_id,
                status='pending'
            )
        else:
            requests = TimeOffRequest.objects.filter(
                employee__supervisor=employee,
                status='pending'
            )
        
        serializer = self.get_serializer(requests, many=True)
        return Response({'requests': serializer.data})
    
    @action(detail=False, methods=['get'])
    def calendar_view(self, request):
        """Get time off for calendar display"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = self.get_queryset().filter(
            status='approved'
        )
        
        if start_date:
            queryset = queryset.filter(end_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(start_date__lte=end_date)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({'time_off_requests': serializer.data})


class GeofenceZoneViewSet(viewsets.ModelViewSet):
    """ViewSet for geofence zones"""
    serializer_class = GeofenceZoneSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    
    def get_queryset(self):
        return GeofenceZone.objects.filter(
            business_id=self.request.user.business_id
        )
    
    def perform_create(self, serializer):
        serializer.save(business_id=self.request.user.business_id)