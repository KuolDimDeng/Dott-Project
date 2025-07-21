from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.decorators import api_view, permission_classes
from django.core.paginator import Paginator
from django.db import transaction
import json
import logging
from ipware import get_client_ip

from .models import Lead, LeadActivity
from utils.response_utils import create_success_response, create_error_response


logger = logging.getLogger(__name__)


class CreateLeadView(APIView):
    """
    Create a new lead - public endpoint for forms
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            data = request.data
            
            # Extract IP address
            client_ip, is_routable = get_client_ip(request)
            
            # Required fields
            email = data.get('email', '').strip().lower()
            source = data.get('source', '').strip()
            
            if not email or not source:
                return create_error_response(
                    "Email and source are required",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if lead already exists for this email and source
            existing_lead = Lead.objects.filter(
                email=email, 
                source=source
            ).first()
            
            if existing_lead:
                # Update existing lead with new information
                lead = existing_lead
                lead.message = data.get('message', lead.message)
                lead.first_name = data.get('first_name', lead.first_name)
                lead.last_name = data.get('last_name', lead.last_name)
                lead.company_name = data.get('company_name', lead.company_name)
                lead.phone_number = data.get('phone_number', lead.phone_number)
                lead.country = data.get('country', lead.country)
                
                # Update additional data
                additional_data = lead.additional_data or {}
                new_additional_data = data.get('additional_data', {})
                additional_data.update(new_additional_data)
                lead.additional_data = additional_data
                
                lead.updated_at = timezone.now()
                lead.save()
                
                # Log activity
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='contacted',
                    description=f"Updated existing lead from {source}",
                    created_by=None
                )
                
                logger.info(f"Updated existing lead: {email} from {source}")
                
            else:
                # Create new lead
                lead = Lead.objects.create(
                    email=email,
                    first_name=data.get('first_name', '').strip(),
                    last_name=data.get('last_name', '').strip(),
                    company_name=data.get('company_name', '').strip(),
                    phone_number=data.get('phone_number', '').strip(),
                    source=source,
                    message=data.get('message', '').strip(),
                    country=data.get('country', '').strip(),
                    ip_address=client_ip,
                    additional_data=data.get('additional_data', {})
                )
                
                # Log activity
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='created',
                    description=f"New lead created from {source}",
                    created_by=None
                )
                
                logger.info(f"Created new lead: {email} from {source}")
            
            return create_success_response(
                data=lead.to_dict(),
                message="Lead saved successfully"
            )
            
        except Exception as e:
            logger.error(f"Error creating lead: {str(e)}")
            return create_error_response(
                "Failed to save lead information",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LeadsListView(APIView):
    """
    List and manage leads - admin only
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get paginated list of leads with filtering"""
        try:
            # Get query parameters
            page = int(request.GET.get('page', 1))
            per_page = min(int(request.GET.get('per_page', 20)), 100)  # Max 100 per page
            search = request.GET.get('search', '').strip()
            source_filter = request.GET.get('source', '').strip()
            status_filter = request.GET.get('status', '').strip()
            date_from = request.GET.get('date_from', '').strip()
            date_to = request.GET.get('date_to', '').strip()
            
            # Build queryset
            queryset = Lead.objects.all()
            
            # Apply filters
            if search:
                queryset = queryset.filter(
                    Q(email__icontains=search) |
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search) |
                    Q(company_name__icontains=search) |
                    Q(message__icontains=search)
                )
            
            if source_filter:
                queryset = queryset.filter(source=source_filter)
            
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            if date_from:
                queryset = queryset.filter(created_at__date__gte=date_from)
            
            if date_to:
                queryset = queryset.filter(created_at__date__lte=date_to)
            
            # Order by most recent
            queryset = queryset.order_by('-created_at')
            
            # Paginate
            paginator = Paginator(queryset, per_page)
            page_obj = paginator.get_page(page)
            
            # Convert to dict
            leads_data = [lead.to_dict() for lead in page_obj]
            
            # Get statistics
            total_leads = Lead.objects.count()
            new_leads = Lead.objects.filter(status='new').count()
            converted_leads = Lead.objects.filter(status='converted').count()
            
            # Source breakdown
            source_stats = {}
            for choice_value, choice_label in Lead.SOURCE_CHOICES:
                count = Lead.objects.filter(source=choice_value).count()
                if count > 0:
                    source_stats[choice_value] = {
                        'label': choice_label,
                        'count': count
                    }
            
            return create_success_response(data={
                'leads': leads_data,
                'pagination': {
                    'current_page': page_obj.number,
                    'total_pages': paginator.num_pages,
                    'total_count': paginator.count,
                    'per_page': per_page,
                    'has_next': page_obj.has_next(),
                    'has_previous': page_obj.has_previous(),
                },
                'statistics': {
                    'total_leads': total_leads,
                    'new_leads': new_leads,
                    'converted_leads': converted_leads,
                    'conversion_rate': round(converted_leads / total_leads * 100, 1) if total_leads > 0 else 0,
                    'source_breakdown': source_stats,
                }
            })
            
        except Exception as e:
            logger.error(f"Error fetching leads: {str(e)}")
            return create_error_response(
                "Failed to fetch leads",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LeadDetailView(APIView):
    """
    Get, update, or delete a specific lead
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request, lead_id):
        """Get lead details with activity history"""
        try:
            lead = get_object_or_404(Lead, id=lead_id)
            
            # Get recent activities
            activities = LeadActivity.objects.filter(lead=lead).order_by('-created_at')[:10]
            activities_data = []
            for activity in activities:
                activities_data.append({
                    'id': activity.id,
                    'type': activity.activity_type,
                    'type_display': activity.get_activity_type_display(),
                    'description': activity.description,
                    'created_by': {
                        'id': activity.created_by.id,
                        'name': activity.created_by.get_full_name(),
                        'email': activity.created_by.email,
                    } if activity.created_by else None,
                    'created_at': activity.created_at.isoformat(),
                })
            
            data = lead.to_dict()
            data['activities'] = activities_data
            
            return create_success_response(data=data)
            
        except Exception as e:
            logger.error(f"Error fetching lead {lead_id}: {str(e)}")
            return create_error_response(
                "Failed to fetch lead details",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def patch(self, request, lead_id):
        """Update lead information"""
        try:
            lead = get_object_or_404(Lead, id=lead_id)
            data = request.data
            
            # Track changes
            changes = []
            
            # Update status
            if 'status' in data and data['status'] != lead.status:
                old_status = lead.get_status_display()
                lead.status = data['status']
                new_status = lead.get_status_display()
                changes.append(f"Status changed from {old_status} to {new_status}")
                
                # Update contacted_at if status changed to contacted
                if data['status'] == 'contacted' and not lead.contacted_at:
                    lead.contacted_at = timezone.now()
                    changes.append("First contact time recorded")
            
            # Update assigned staff
            if 'assigned_to' in data:
                if data['assigned_to']:
                    try:
                        user = User.objects.get(id=data['assigned_to'])
                        if lead.assigned_to != user:
                            old_assigned = lead.assigned_to.get_full_name() if lead.assigned_to else "Unassigned"
                            lead.assigned_to = user
                            changes.append(f"Assigned from {old_assigned} to {user.get_full_name()}")
                    except User.DoesNotExist:
                        return create_error_response("Invalid user ID for assignment")
                else:
                    if lead.assigned_to:
                        old_assigned = lead.assigned_to.get_full_name()
                        lead.assigned_to = None
                        changes.append(f"Unassigned from {old_assigned}")
            
            # Add notes
            if 'notes' in data and data['notes'].strip():
                lead.add_note(data['notes'].strip(), request.user)
                changes.append("Note added")
            
            # Update other fields
            updateable_fields = ['first_name', 'last_name', 'company_name', 'phone_number', 'country']
            for field in updateable_fields:
                if field in data and getattr(lead, field) != data[field]:
                    old_value = getattr(lead, field) or "(empty)"
                    setattr(lead, field, data[field])
                    changes.append(f"{field.replace('_', ' ').title()} changed from {old_value} to {data[field]}")
            
            lead.save()
            
            # Log activity if there were changes
            if changes:
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='status_changed' if 'status' in data else 'note_added',
                    description="; ".join(changes),
                    created_by=request.user
                )
            
            return create_success_response(
                data=lead.to_dict(),
                message="Lead updated successfully"
            )
            
        except Exception as e:
            logger.error(f"Error updating lead {lead_id}: {str(e)}")
            return create_error_response(
                "Failed to update lead",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_lead_stats(request):
    """Get lead statistics for dashboard widgets"""
    try:
        # Recent leads (last 7 days)
        from datetime import datetime, timedelta
        week_ago = timezone.now() - timedelta(days=7)
        
        stats = {
            'total_leads': Lead.objects.count(),
            'new_leads_this_week': Lead.objects.filter(created_at__gte=week_ago).count(),
            'leads_by_status': {},
            'leads_by_source': {},
            'recent_leads': [],
        }
        
        # Status breakdown
        for status_value, status_label in Lead.STATUS_CHOICES:
            count = Lead.objects.filter(status=status_value).count()
            stats['leads_by_status'][status_value] = {
                'label': status_label,
                'count': count
            }
        
        # Source breakdown
        for source_value, source_label in Lead.SOURCE_CHOICES:
            count = Lead.objects.filter(source=source_value).count()
            if count > 0:
                stats['leads_by_source'][source_value] = {
                    'label': source_label,
                    'count': count
                }
        
        # Recent leads
        recent_leads = Lead.objects.order_by('-created_at')[:5]
        for lead in recent_leads:
            stats['recent_leads'].append({
                'id': lead.id,
                'email': lead.email,
                'full_name': lead.full_name,
                'source': lead.get_source_display(),
                'created_at': lead.created_at.isoformat(),
            })
        
        return create_success_response(data=stats)
        
    except Exception as e:
        logger.error(f"Error fetching lead stats: {str(e)}")
        return create_error_response("Failed to fetch statistics")