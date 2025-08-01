"""
Comprehensive Timesheet Management Views V2
Handles employee timesheets, leave requests, and supervisor approvals
"""
import logging
from datetime import datetime, timedelta, date
from decimal import Decimal
from django.db import transaction, models
from django.db.models import Q, Sum, Count, F
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied

from .models import Timesheet, TimeEntry, ClockEntry, TimeOffRequest, GeofenceZone
from .serializers import (
    TimesheetSerializer, TimeEntrySerializer, ClockEntrySerializer,
    TimeOffRequestSerializer, GeofenceZoneSerializer
)
from hr.models import Employee
from custom_auth.models import User

logger = logging.getLogger(__name__)


class EmployeeTimesheetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for employees to manage their own timesheets
    """
    serializer_class = TimesheetSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get timesheets for the current employee"""
        user = self.request.user
        logger.info(f"[EmployeeTimesheetViewSet] Getting timesheets for user: {user.email}")
        
        try:
            # Get employee record for the user
            employee = Employee.objects.get(user=user)
            logger.info(f"[EmployeeTimesheetViewSet] Found employee: {employee.id}")
            
            # Return timesheets for this employee
            return Timesheet.objects.filter(
                employee=employee
            ).select_related(
                'employee', 'supervisor', 'approved_by'
            ).prefetch_related('entries').order_by('-week_starting')
            
        except Employee.DoesNotExist:
            logger.warning(f"[EmployeeTimesheetViewSet] No employee record for user: {user.email}")
            return Timesheet.objects.none()
    
    @action(detail=False, methods=['GET'])
    def current_week(self, request):
        """Get or create timesheet for current week"""
        try:
            employee = Employee.objects.get(user=request.user)
            
            # Calculate current week start (Monday)
            today = timezone.now().date()
            week_start = today - timedelta(days=today.weekday())
            week_end = week_start + timedelta(days=6)
            
            logger.info(f"[EmployeeTimesheetViewSet] Getting timesheet for week: {week_start} to {week_end}")
            
            # Get or create timesheet
            timesheet, created = Timesheet.objects.get_or_create(
                employee=employee,
                week_starting=week_start,
                defaults={
                    'week_ending': week_end,
                    'supervisor': employee.supervisor,
                    'business_id': employee.business_id,
                    'hourly_rate': getattr(employee, 'wage_per_hour', None),
                    'overtime_rate': employee.wage_per_hour * Decimal('1.5') if getattr(employee, 'wage_per_hour', None) else None
                }
            )
            
            if created:
                logger.info(f"[EmployeeTimesheetViewSet] Created new timesheet: {timesheet.id}")
                # Create empty time entries for the week
                for i in range(7):
                    entry_date = week_start + timedelta(days=i)
                    TimeEntry.objects.create(
                        timesheet=timesheet,
                        date=entry_date
                    )
            
            serializer = self.get_serializer(timesheet)
            return Response(serializer.data)
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "No employee record found for user"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['POST'])
    def submit_for_approval(self, request, pk=None):
        """Submit timesheet for supervisor approval"""
        timesheet = self.get_object()
        
        if timesheet.status != 'draft':
            return Response(
                {"error": f"Cannot submit timesheet in {timesheet.status} status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate timesheet has hours
        if timesheet.total_hours == 0:
            return Response(
                {"error": "Cannot submit timesheet with no hours"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update status
        timesheet.status = 'submitted'
        timesheet.submitted_at = timezone.now()
        timesheet.save()
        
        logger.info(f"[EmployeeTimesheetViewSet] Timesheet {timesheet.id} submitted for approval")
        
        # TODO: Send notification to supervisor
        
        serializer = self.get_serializer(timesheet)
        return Response(serializer.data)
    
    @action(detail=True, methods=['POST'])
    def update_entries(self, request, pk=None):
        """Update time entries for a timesheet"""
        timesheet = self.get_object()
        
        if timesheet.status not in ['draft', 'rejected']:
            return Response(
                {"error": f"Cannot update timesheet in {timesheet.status} status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        entries_data = request.data.get('entries', [])
        logger.info(f"[EmployeeTimesheetViewSet] Updating {len(entries_data)} entries for timesheet {timesheet.id}")
        
        with transaction.atomic():
            for entry_data in entries_data:
                entry_id = entry_data.get('id')
                if entry_id:
                    try:
                        entry = TimeEntry.objects.get(id=entry_id, timesheet=timesheet)
                        for field, value in entry_data.items():
                            if field != 'id' and hasattr(entry, field):
                                setattr(entry, field, value)
                        entry.save()
                        logger.info(f"[EmployeeTimesheetViewSet] Updated entry {entry_id}")
                    except TimeEntry.DoesNotExist:
                        logger.error(f"[EmployeeTimesheetViewSet] Entry {entry_id} not found")
            
            # Recalculate totals
            timesheet.calculate_totals()
        
        serializer = self.get_serializer(timesheet)
        return Response(serializer.data)


class TimeOffRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing time off requests
    """
    serializer_class = TimeOffRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get time off requests based on user role"""
        user = self.request.user
        
        try:
            employee = Employee.objects.get(user=user)
            
            # Base queryset for employee's own requests
            queryset = TimeOffRequest.objects.filter(
                employee=employee
            )
            
            # If employee is a supervisor, include team requests
            if employee.is_supervisor:
                team_requests = TimeOffRequest.objects.filter(
                    employee__supervisor=employee
                )
                queryset = queryset | team_requests
            
            return queryset.select_related(
                'employee', 'employee__user', 'reviewed_by'
            ).order_by('-created_at')
            
        except Employee.DoesNotExist:
            return TimeOffRequest.objects.none()
    
    def create(self, request, *args, **kwargs):
        """Create a new time off request"""
        try:
            employee = Employee.objects.get(user=request.user)
            
            # Add employee and business_id to request data
            data = request.data.copy()
            data['employee'] = employee.id
            data['business_id'] = str(employee.business_id)
            
            logger.info(f"[TimeOffRequestViewSet] Creating time off request for employee {employee.id}")
            
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            
            # Calculate duration
            time_off_request = serializer.save()
            time_off_request.calculate_duration()
            
            # TODO: Send notification to supervisor
            if employee.supervisor:
                logger.info(f"[TimeOffRequestViewSet] Notifying supervisor {employee.supervisor.id}")
            
            return Response(
                self.get_serializer(time_off_request).data,
                status=status.HTTP_201_CREATED
            )
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "No employee record found for user"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['GET'])
    def pending_approvals(self, request):
        """Get pending time off requests for supervisor approval"""
        try:
            employee = Employee.objects.get(user=request.user)
            
            if not employee.is_supervisor:
                return Response(
                    {"error": "You are not authorized to view approvals"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get pending requests from team members
            pending_requests = TimeOffRequest.objects.filter(
                employee__supervisor=employee,
                status='pending'
            ).select_related(
                'employee', 'employee__user'
            ).order_by('start_date')
            
            serializer = self.get_serializer(pending_requests, many=True)
            
            logger.info(f"[TimeOffRequestViewSet] Found {pending_requests.count()} pending approvals for supervisor {employee.id}")
            
            return Response({
                "count": pending_requests.count(),
                "requests": serializer.data
            })
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "No employee record found for user"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['POST'])
    def approve(self, request, pk=None):
        """Approve a time off request"""
        time_off_request = self.get_object()
        
        try:
            employee = Employee.objects.get(user=request.user)
            
            # Check if user is the supervisor
            if time_off_request.employee.supervisor != employee:
                return Response(
                    {"error": "You are not authorized to approve this request"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            if time_off_request.status != 'pending':
                return Response(
                    {"error": f"Cannot approve request in {time_off_request.status} status"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Approve the request
            time_off_request.status = 'approved'
            time_off_request.reviewed_by = request.user
            time_off_request.reviewed_at = timezone.now()
            time_off_request.review_notes = request.data.get('notes', '')
            time_off_request.save()
            
            logger.info(f"[TimeOffRequestViewSet] Request {time_off_request.id} approved by {employee.id}")
            
            # TODO: Send notification to employee
            
            serializer = self.get_serializer(time_off_request)
            return Response(serializer.data)
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "No employee record found for user"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['POST'])
    def reject(self, request, pk=None):
        """Reject a time off request"""
        time_off_request = self.get_object()
        
        try:
            employee = Employee.objects.get(user=request.user)
            
            # Check if user is the supervisor
            if time_off_request.employee.supervisor != employee:
                return Response(
                    {"error": "You are not authorized to reject this request"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            if time_off_request.status != 'pending':
                return Response(
                    {"error": f"Cannot reject request in {time_off_request.status} status"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Reject the request
            time_off_request.status = 'rejected'
            time_off_request.reviewed_by = request.user
            time_off_request.reviewed_at = timezone.now()
            time_off_request.review_notes = request.data.get('notes', 'Request rejected')
            time_off_request.save()
            
            logger.info(f"[TimeOffRequestViewSet] Request {time_off_request.id} rejected by {employee.id}")
            
            # TODO: Send notification to employee
            
            serializer = self.get_serializer(time_off_request)
            return Response(serializer.data)
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "No employee record found for user"},
                status=status.HTTP_404_NOT_FOUND
            )


class ClockEntryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for clock in/out entries
    """
    serializer_class = ClockEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get clock entries for the current employee"""
        user = self.request.user
        
        try:
            employee = Employee.objects.get(user=user)
            return ClockEntry.objects.filter(
                employee=employee
            ).order_by('-timestamp')[:100]  # Last 100 entries
            
        except Employee.DoesNotExist:
            return ClockEntry.objects.none()
    
    @action(detail=False, methods=['POST'])
    def clock_in(self, request):
        """Clock in for work"""
        try:
            employee = Employee.objects.get(user=request.user)
            
            # Check if already clocked in
            last_entry = ClockEntry.objects.filter(
                employee=employee,
                timestamp__date=timezone.now().date()
            ).order_by('-timestamp').first()
            
            if last_entry and last_entry.entry_type == 'clock_in':
                return Response(
                    {"error": "You are already clocked in"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create clock in entry
            clock_entry = ClockEntry.objects.create(
                employee=employee,
                business_id=employee.business_id,
                entry_type='clock_in',
                timestamp=timezone.now(),
                location_enabled=request.data.get('location_enabled', False),
                latitude=request.data.get('latitude'),
                longitude=request.data.get('longitude'),
                location_accuracy=request.data.get('location_accuracy'),
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                device_type=request.data.get('device_type', 'web'),
                notes=request.data.get('notes', '')
            )
            
            # Check geofence if location provided
            if clock_entry.location_enabled and clock_entry.latitude and clock_entry.longitude:
                geofence_zones = GeofenceZone.objects.filter(
                    business_id=employee.business_id,
                    is_active=True
                )
                
                for zone in geofence_zones:
                    if zone.is_point_inside(clock_entry.latitude, clock_entry.longitude):
                        clock_entry.is_within_geofence = True
                        break
                else:
                    clock_entry.is_within_geofence = False
                
                clock_entry.save()
            
            logger.info(f"[ClockEntryViewSet] Employee {employee.id} clocked in at {clock_entry.timestamp}")
            
            serializer = self.get_serializer(clock_entry)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "No employee record found for user"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['POST'])
    def clock_out(self, request):
        """Clock out from work"""
        try:
            employee = Employee.objects.get(user=request.user)
            
            # Check if clocked in
            last_entry = ClockEntry.objects.filter(
                employee=employee,
                timestamp__date=timezone.now().date()
            ).order_by('-timestamp').first()
            
            if not last_entry or last_entry.entry_type != 'clock_in':
                return Response(
                    {"error": "You are not clocked in"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create clock out entry
            clock_entry = ClockEntry.objects.create(
                employee=employee,
                business_id=employee.business_id,
                entry_type='clock_out',
                timestamp=timezone.now(),
                location_enabled=request.data.get('location_enabled', False),
                latitude=request.data.get('latitude'),
                longitude=request.data.get('longitude'),
                location_accuracy=request.data.get('location_accuracy'),
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                device_type=request.data.get('device_type', 'web'),
                notes=request.data.get('notes', '')
            )
            
            # Calculate hours worked and update timesheet
            hours_worked = (clock_entry.timestamp - last_entry.timestamp).total_seconds() / 3600
            
            # Update today's timesheet entry
            today = timezone.now().date()
            week_start = today - timedelta(days=today.weekday())
            
            timesheet, _ = Timesheet.objects.get_or_create(
                employee=employee,
                week_starting=week_start,
                defaults={
                    'week_ending': week_start + timedelta(days=6),
                    'supervisor': employee.supervisor,
                    'business_id': employee.business_id,
                    'hourly_rate': getattr(employee, 'wage_per_hour', None),
                    'overtime_rate': employee.wage_per_hour * Decimal('1.5') if getattr(employee, 'wage_per_hour', None) else None
                }
            )
            
            time_entry, _ = TimeEntry.objects.get_or_create(
                timesheet=timesheet,
                date=today
            )
            
            # Add hours (simple version - should handle overtime logic)
            time_entry.regular_hours = Decimal(str(round(hours_worked, 2)))
            time_entry.save()
            
            logger.info(f"[ClockEntryViewSet] Employee {employee.id} clocked out at {clock_entry.timestamp}, worked {hours_worked:.2f} hours")
            
            serializer = self.get_serializer(clock_entry)
            return Response({
                "clock_entry": serializer.data,
                "hours_worked": round(hours_worked, 2)
            }, status=status.HTTP_201_CREATED)
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "No employee record found for user"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['GET'])
    def status(self, request):
        """Get current clock status"""
        try:
            employee = Employee.objects.get(user=request.user)
            
            # Get last entry for today
            last_entry = ClockEntry.objects.filter(
                employee=employee,
                timestamp__date=timezone.now().date()
            ).order_by('-timestamp').first()
            
            is_clocked_in = last_entry and last_entry.entry_type == 'clock_in'
            
            response_data = {
                "is_clocked_in": is_clocked_in,
                "last_entry": None
            }
            
            if last_entry:
                response_data["last_entry"] = {
                    "type": last_entry.entry_type,
                    "timestamp": last_entry.timestamp,
                    "hours_since": round((timezone.now() - last_entry.timestamp).total_seconds() / 3600, 2) if is_clocked_in else None
                }
            
            return Response(response_data)
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "No employee record found for user"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SupervisorApprovalViewSet(viewsets.ViewSet):
    """
    ViewSet for supervisor approval actions
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['GET'])
    def pending_timesheets(self, request):
        """Get pending timesheets for approval"""
        try:
            employee = Employee.objects.get(user=request.user)
            
            if not employee.is_supervisor:
                return Response(
                    {"error": "You are not authorized to view approvals"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get submitted timesheets from team members
            pending_timesheets = Timesheet.objects.filter(
                employee__supervisor=employee,
                status='submitted'
            ).select_related(
                'employee', 'employee__user'
            ).order_by('week_starting')
            
            serializer = TimesheetSerializer(pending_timesheets, many=True)
            
            logger.info(f"[SupervisorApprovalViewSet] Found {pending_timesheets.count()} pending timesheets for supervisor {employee.id}")
            
            return Response({
                "count": pending_timesheets.count(),
                "timesheets": serializer.data
            })
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "No employee record found for user"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['POST'])
    def approve_timesheet(self, request):
        """Approve a timesheet"""
        timesheet_id = request.data.get('timesheet_id')
        
        try:
            employee = Employee.objects.get(user=request.user)
            timesheet = Timesheet.objects.get(id=timesheet_id)
            
            # Check if user is the supervisor
            if timesheet.employee.supervisor != employee:
                return Response(
                    {"error": "You are not authorized to approve this timesheet"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            if timesheet.status != 'submitted':
                return Response(
                    {"error": f"Cannot approve timesheet in {timesheet.status} status"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Approve the timesheet
            timesheet.status = 'approved'
            timesheet.approved_by = request.user
            timesheet.approved_at = timezone.now()
            timesheet.supervisor_notes = request.data.get('notes', '')
            timesheet.save()
            
            logger.info(f"[SupervisorApprovalViewSet] Timesheet {timesheet.id} approved by {employee.id}")
            
            # TODO: Send notification to employee and HR
            
            serializer = TimesheetSerializer(timesheet)
            return Response(serializer.data)
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "No employee record found for user"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Timesheet.DoesNotExist:
            return Response(
                {"error": "Timesheet not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['POST'])
    def reject_timesheet(self, request):
        """Reject a timesheet"""
        timesheet_id = request.data.get('timesheet_id')
        
        try:
            employee = Employee.objects.get(user=request.user)
            timesheet = Timesheet.objects.get(id=timesheet_id)
            
            # Check if user is the supervisor
            if timesheet.employee.supervisor != employee:
                return Response(
                    {"error": "You are not authorized to reject this timesheet"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            if timesheet.status != 'submitted':
                return Response(
                    {"error": f"Cannot reject timesheet in {timesheet.status} status"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Reject the timesheet
            timesheet.status = 'rejected'
            timesheet.approved_by = request.user
            timesheet.approved_at = timezone.now()
            timesheet.supervisor_notes = request.data.get('notes', 'Please review and resubmit')
            timesheet.save()
            
            logger.info(f"[SupervisorApprovalViewSet] Timesheet {timesheet.id} rejected by {employee.id}")
            
            # TODO: Send notification to employee
            
            serializer = TimesheetSerializer(timesheet)
            return Response(serializer.data)
            
        except Employee.DoesNotExist:
            return Response(
                {"error": "No employee record found for user"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Timesheet.DoesNotExist:
            return Response(
                {"error": "Timesheet not found"},
                status=status.HTTP_404_NOT_FOUND
            )