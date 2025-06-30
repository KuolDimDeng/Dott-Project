"""
API views for multi-state tax operations.
Provides comprehensive endpoints for nexus tracking, apportionment calculation, and multi-state filing.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from decimal import Decimal
from datetime import date, timedelta
import logging

from custom_auth.permissions import TenantPermission
from .models import (
    MultistateNexusProfile, StateNexusStatus, BusinessActivity,
    ApportionmentFactors, MultistateReturn, StateReturnFiling,
    NexusThresholdMonitoring, ReciprocityAgreement, ConsolidatedGroup
)
from .serializers import (
    MultistateNexusProfileSerializer, StateNexusStatusSerializer, BusinessActivitySerializer,
    ApportionmentFactorsSerializer, MultistateReturnSerializer, StateReturnFilingSerializer,
    NexusThresholdMonitoringSerializer, ReciprocityAgreementSerializer, ConsolidatedGroupSerializer,
    NexusAnalysisRequestSerializer, ApportionmentCalculationRequestSerializer,
    MultistateReturnGenerationRequestSerializer, NexusUpdateRequestSerializer,
    ComplianceReportRequestSerializer
)
from .nexus_tracker import NexusTracker, NexusActivity, ActivityType, TaxType
from .apportionment_calculator import ApportionmentCalculator, MultistateReturnProcessor

logger = logging.getLogger(__name__)


class MultistateNexusProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing multistate nexus profiles.
    Provides comprehensive nexus management for businesses operating across multiple states.
    """
    
    serializer_class = MultistateNexusProfileSerializer
    permission_classes = [IsAuthenticated, TenantPermission]
    
    def get_queryset(self):
        return MultistateNexusProfile.objects.filter(
            tenant=self.request.user.tenant
        ).prefetch_related(
            'state_nexus_statuses',
            'business_activities',
            'apportionment_factors',
            'multistate_returns'
        )
    
    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)
    
    @action(detail=True, methods=['post'])
    def analyze_nexus(self, request, pk=None):
        """
        Analyze nexus status across all states for this profile.
        """
        profile = self.get_object()
        serializer = NexusAnalysisRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Initialize nexus tracker
            nexus_tracker = NexusTracker(tenant_id=str(profile.tenant.id))
            
            # Add existing business activities
            for activity in profile.business_activities.filter(is_active=True):
                nexus_activity = NexusActivity(
                    activity_type=ActivityType(activity.activity_type),
                    state=activity.state,
                    start_date=activity.start_date,
                    end_date=activity.end_date,
                    description=activity.description,
                    value=activity.annual_value
                )
                nexus_tracker.add_activity(nexus_activity)
            
            # Perform nexus analysis
            business_data = serializer.validated_data['sales_data']
            check_date = serializer.validated_data.get('check_date', date.today())
            
            nexus_status = nexus_tracker.get_all_nexus_status(business_data, check_date)
            compliance_requirements = nexus_tracker.get_compliance_requirements(nexus_status)
            threshold_warnings = nexus_tracker.monitor_threshold_proximity(business_data)
            
            # Update or create nexus status records
            for state, tax_types in nexus_status.items():
                for tax_type, status_obj in tax_types.items():
                    nexus_record, created = StateNexusStatus.objects.update_or_create(
                        nexus_profile=profile,
                        state=state,
                        tax_type=tax_type.value,
                        defaults={
                            'has_nexus': status_obj.has_nexus,
                            'nexus_types': [nt.value for nt in status_obj.nexus_types],
                            'nexus_effective_date': status_obj.effective_date,
                            'threshold_analysis': status_obj.threshold_analysis,
                            'current_sales': business_data.get(f'{state}_sales', Decimal('0')),
                            'current_transactions': business_data.get(f'{state}_transactions', 0),
                            'current_payroll': business_data.get(f'{state}_payroll', Decimal('0')),
                            'current_property': business_data.get(f'{state}_property', Decimal('0'))
                        }
                    )
            
            # Create threshold monitoring alerts
            for state, warnings in threshold_warnings.items():
                for warning in warnings:
                    NexusThresholdMonitoring.objects.create(
                        nexus_profile=profile,
                        alert_type='approaching_threshold',
                        priority='medium' if warning['percentage'] > 90 else 'low',
                        state=state,
                        tax_type='sales_tax',
                        current_value=warning['current'],
                        threshold_value=warning['threshold'],
                        percentage_of_threshold=warning['percentage'],
                        message=f"Approaching {warning['type']} threshold in {state}",
                        recommendations=[f"Monitor {warning['type']} closely", "Consider registration preparation"],
                        next_check_date=timezone.now() + timedelta(days=7)
                    )
            
            return Response({
                'nexus_analysis': {
                    state: {
                        tax_type.value: {
                            'has_nexus': status_obj.has_nexus,
                            'nexus_types': [nt.value for nt in status_obj.nexus_types],
                            'effective_date': status_obj.effective_date,
                            'analysis': status_obj.threshold_analysis
                        }
                        for tax_type, status_obj in tax_types.items()
                    }
                    for state, tax_types in nexus_status.items()
                },
                'compliance_requirements': compliance_requirements,
                'threshold_warnings': threshold_warnings,
                'analysis_date': check_date
            })
            
        except Exception as e:
            logger.error(f"Nexus analysis failed: {str(e)}")
            return Response(
                {'error': 'Nexus analysis failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def calculate_apportionment(self, request, pk=None):
        """
        Calculate apportionment factors for multi-state income tax filing.
        """
        profile = self.get_object()
        serializer = ApportionmentCalculationRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Initialize apportionment calculator
            calculator = ApportionmentCalculator(tenant_id=str(profile.tenant.id))
            
            # Prepare business data
            business_data = {
                'tax_year': serializer.validated_data['tax_year'],
                'total_income': serializer.validated_data['total_income'],
                'total_sales': serializer.validated_data['total_sales'],
                'total_payroll': serializer.validated_data['total_payroll'],
                'total_property': serializer.validated_data['total_property'],
                'states': [],
                'calculation_date': timezone.now().date()
            }
            
            # Add state-specific data
            state_data = serializer.validated_data['state_data']
            for state, data in state_data.items():
                business_data['states'].append(state)
                business_data[f'{state}_sales'] = data.get('sales', Decimal('0'))
                business_data[f'{state}_payroll'] = data.get('payroll', Decimal('0'))
                business_data[f'{state}_property'] = data.get('property', Decimal('0'))
            
            # Calculate apportionment factors
            factors = calculator.calculate_multistate_apportionment(business_data)
            validation_warnings = calculator.validate_apportionment_factors(factors)
            filing_method = calculator.determine_filing_method(
                business_data['states'], 
                business_data['total_income']
            )
            
            # Save apportionment factors
            apportionment_record = ApportionmentFactors.objects.create(
                nexus_profile=profile,
                tax_year=business_data['tax_year'],
                total_sales=business_data['total_sales'],
                total_payroll=business_data['total_payroll'],
                total_property=business_data['total_property'],
                total_income=business_data['total_income'],
                state_sales={state: float(business_data.get(f'{state}_sales', 0)) for state in business_data['states']},
                state_payroll={state: float(business_data.get(f'{state}_payroll', 0)) for state in business_data['states']},
                state_property={state: float(business_data.get(f'{state}_property', 0)) for state in business_data['states']},
                sales_factors={state: float(factor) for state, factor in factors.sales_factor.items()},
                payroll_factors={state: float(factor) for state, factor in factors.payroll_factor.items()},
                property_factors={state: float(factor) for state, factor in factors.property_factor.items()},
                apportionment_percentages={state: float(pct) for state, pct in factors.apportionment_percentage.items()},
                validation_warnings=validation_warnings,
                calculation_method=serializer.validated_data['filing_method']
            )
            
            return Response({
                'apportionment_factors': ApportionmentFactorsSerializer(apportionment_record).data,
                'filing_method_recommendation': filing_method.value,
                'validation_warnings': validation_warnings,
                'calculation_summary': {
                    'total_apportionment': sum(factors.apportionment_percentage.values()),
                    'states_included': len(business_data['states']),
                    'calculation_date': business_data['calculation_date']
                }
            })
            
        except Exception as e:
            logger.error(f"Apportionment calculation failed: {str(e)}")
            return Response(
                {'error': 'Apportionment calculation failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def generate_multistate_return(self, request, pk=None):
        """
        Generate a complete multi-state tax return.
        """
        profile = self.get_object()
        serializer = MultistateReturnGenerationRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get apportionment factors
            apportionment_factors = get_object_or_404(
                ApportionmentFactors,
                id=serializer.validated_data['apportionment_factors_id'],
                nexus_profile=profile
            )
            
            # Initialize return processor
            processor = MultistateReturnProcessor(tenant_id=str(profile.tenant.id))
            
            # Prepare business data
            business_data = {
                'tax_year': serializer.validated_data['tax_year'],
                'total_income': apportionment_factors.total_income,
                'states': serializer.validated_data['states_to_file'],
                'calculation_date': timezone.now().date()
            }
            
            # Process multistate return
            return_data = processor.process_multistate_return(business_data)
            
            # Create multistate return record
            multistate_return = MultistateReturn.objects.create(
                nexus_profile=profile,
                apportionment_factors=apportionment_factors,
                return_type=serializer.validated_data['return_type'],
                tax_year=serializer.validated_data['tax_year'],
                due_date=serializer.validated_data['due_date'],
                extended_due_date=serializer.validated_data.get('extended_due_date'),
                filing_method=serializer.validated_data['filing_method'],
                electronic_filing=serializer.validated_data['electronic_filing'],
                state_tax_calculations=return_data['state_liabilities'],
                total_tax_due=return_data['total_tax_due'],
                filing_status='draft'
            )
            
            # Create state return filings
            for state in serializer.validated_data['states_to_file']:
                state_liability = return_data['state_liabilities'].get(state, {})
                apportioned_income = apportionment_factors.total_income * Decimal(str(
                    apportionment_factors.apportionment_percentages.get(state, 0)
                ))
                
                StateReturnFiling.objects.create(
                    multistate_return=multistate_return,
                    state=state,
                    state_return_type=f"{state} {serializer.validated_data['return_type']}",
                    apportioned_income=apportioned_income,
                    apportionment_percentage=Decimal(str(
                        apportionment_factors.apportionment_percentages.get(state, 0)
                    )),
                    total_tax_due=state_liability.get('total_tax', Decimal('0')),
                    filing_status='draft'
                )
            
            return Response({
                'multistate_return': MultistateReturnSerializer(multistate_return).data,
                'return_summary': return_data,
                'generation_status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Multistate return generation failed: {str(e)}")
            return Response(
                {'error': 'Return generation failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def compliance_report(self, request, pk=None):
        """
        Generate a comprehensive compliance report for the nexus profile.
        """
        profile = self.get_object()
        
        try:
            # Get recent nexus statuses
            nexus_statuses = profile.state_nexus_statuses.all()
            
            # Get active monitoring alerts
            monitoring_alerts = profile.threshold_monitoring.filter(
                is_active=True
            ).order_by('-created_at')
            
            # Get recent returns
            recent_returns = profile.multistate_returns.filter(
                tax_year__gte=timezone.now().year - 2
            ).order_by('-tax_year')
            
            # Compile compliance summary
            compliance_summary = {
                'profile': MultistateNexusProfileSerializer(profile).data,
                'nexus_summary': {
                    'total_states': nexus_statuses.count(),
                    'nexus_states': nexus_statuses.filter(has_nexus=True).count(),
                    'registered_states': nexus_statuses.filter(is_registered=True).count(),
                    'states_by_tax_type': {}
                },
                'alerts': NexusThresholdMonitoringSerializer(monitoring_alerts[:10], many=True).data,
                'recent_filings': MultistateReturnSerializer(recent_returns[:5], many=True).data,
                'compliance_score': self._calculate_compliance_score(profile),
                'recommendations': self._generate_compliance_recommendations(profile)
            }
            
            # Group states by tax type
            for status in nexus_statuses:
                if status.tax_type not in compliance_summary['nexus_summary']['states_by_tax_type']:
                    compliance_summary['nexus_summary']['states_by_tax_type'][status.tax_type] = []
                
                compliance_summary['nexus_summary']['states_by_tax_type'][status.tax_type].append({
                    'state': status.state,
                    'has_nexus': status.has_nexus,
                    'is_registered': status.is_registered,
                    'filing_frequency': status.filing_frequency
                })
            
            return Response(compliance_summary)
            
        except Exception as e:
            logger.error(f"Compliance report generation failed: {str(e)}")
            return Response(
                {'error': 'Compliance report generation failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _calculate_compliance_score(self, profile):
        """Calculate a compliance score based on various factors"""
        score = 100
        
        # Deduct points for unregistered nexus states
        nexus_states = profile.state_nexus_statuses.filter(has_nexus=True)
        unregistered = nexus_states.filter(is_registered=False).count()
        score -= unregistered * 15
        
        # Deduct points for active alerts
        active_alerts = profile.threshold_monitoring.filter(is_active=True, acknowledged=False).count()
        score -= active_alerts * 5
        
        # Deduct points for overdue filings (placeholder logic)
        overdue_filings = profile.multistate_returns.filter(
            filing_status='draft',
            due_date__lt=timezone.now().date()
        ).count()
        score -= overdue_filings * 10
        
        return max(score, 0)
    
    def _generate_compliance_recommendations(self, profile):
        """Generate compliance recommendations based on profile status"""
        recommendations = []
        
        # Check for unregistered nexus states
        unregistered_states = profile.state_nexus_statuses.filter(
            has_nexus=True, 
            is_registered=False
        )
        
        if unregistered_states.exists():
            states = [status.state for status in unregistered_states]
            recommendations.append({
                'type': 'registration',
                'priority': 'high',
                'message': f"Register for tax obligations in: {', '.join(states)}",
                'action_required': True
            })
        
        # Check for approaching thresholds
        approaching_thresholds = profile.threshold_monitoring.filter(
            alert_type='approaching_threshold',
            is_active=True,
            percentage_of_threshold__gte=80
        )
        
        if approaching_thresholds.exists():
            recommendations.append({
                'type': 'monitoring',
                'priority': 'medium',
                'message': "Monitor sales activity in states approaching nexus thresholds",
                'action_required': False
            })
        
        # Check for missing apportionment data
        current_year = timezone.now().year
        current_year_factors = profile.apportionment_factors.filter(tax_year=current_year)
        
        if not current_year_factors.exists():
            recommendations.append({
                'type': 'apportionment',
                'priority': 'medium',
                'message': f"Calculate {current_year} apportionment factors",
                'action_required': True
            })
        
        return recommendations


class StateNexusStatusViewSet(viewsets.ModelViewSet):
    """ViewSet for managing state nexus status records"""
    
    serializer_class = StateNexusStatusSerializer
    permission_classes = [IsAuthenticated, TenantPermission]
    
    def get_queryset(self):
        return StateNexusStatus.objects.filter(
            nexus_profile__tenant=self.request.user.tenant
        )
    
    @action(detail=True, methods=['post'])
    def update_registration(self, request, pk=None):
        """Update registration status for a state"""
        nexus_status = self.get_object()
        
        registration_data = request.data
        nexus_status.is_registered = registration_data.get('is_registered', False)
        nexus_status.registration_date = registration_data.get('registration_date')
        nexus_status.registration_number = registration_data.get('registration_number', '')
        nexus_status.save()
        
        return Response({
            'status': 'updated',
            'nexus_status': self.get_serializer(nexus_status).data
        })


class BusinessActivityViewSet(viewsets.ModelViewSet):
    """ViewSet for managing business activities that affect nexus"""
    
    serializer_class = BusinessActivitySerializer
    permission_classes = [IsAuthenticated, TenantPermission]
    
    def get_queryset(self):
        return BusinessActivity.objects.filter(
            nexus_profile__tenant=self.request.user.tenant
        )


class ApportionmentFactorsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing apportionment factors"""
    
    serializer_class = ApportionmentFactorsSerializer
    permission_classes = [IsAuthenticated, TenantPermission]
    
    def get_queryset(self):
        return ApportionmentFactors.objects.filter(
            nexus_profile__tenant=self.request.user.tenant
        )
    
    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        """Finalize apportionment factors"""
        factors = self.get_object()
        
        factors.is_final = True
        factors.approved_by = request.user.email
        factors.approved_date = timezone.now()
        factors.save()
        
        return Response({
            'status': 'finalized',
            'factors': self.get_serializer(factors).data
        })


class MultistateReturnViewSet(viewsets.ModelViewSet):
    """ViewSet for managing multistate tax returns"""
    
    serializer_class = MultistateReturnSerializer
    permission_classes = [IsAuthenticated, TenantPermission]
    
    def get_queryset(self):
        return MultistateReturn.objects.filter(
            nexus_profile__tenant=self.request.user.tenant
        ).prefetch_related('state_filings')
    
    @action(detail=True, methods=['post'])
    def submit_return(self, request, pk=None):
        """Submit the multistate return for filing"""
        return_obj = self.get_object()
        
        if return_obj.filing_status != 'ready_for_review':
            return Response(
                {'error': 'Return must be ready for review before submission'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return_obj.filing_status = 'filed'
        return_obj.filed_date = timezone.now()
        return_obj.save()
        
        # Update state filings
        return_obj.state_filings.update(filing_status='filed')
        
        return Response({
            'status': 'submitted',
            'return': self.get_serializer(return_obj).data
        })


class NexusThresholdMonitoringViewSet(viewsets.ModelViewSet):
    """ViewSet for managing nexus threshold monitoring alerts"""
    
    serializer_class = NexusThresholdMonitoringSerializer
    permission_classes = [IsAuthenticated, TenantPermission]
    
    def get_queryset(self):
        return NexusThresholdMonitoring.objects.filter(
            nexus_profile__tenant=self.request.user.tenant
        ).order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge a monitoring alert"""
        alert = self.get_object()
        
        alert.acknowledged = True
        alert.acknowledged_by = request.user.email
        alert.acknowledged_date = timezone.now()
        alert.save()
        
        return Response({
            'status': 'acknowledged',
            'alert': self.get_serializer(alert).data
        })
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve a monitoring alert"""
        alert = self.get_object()
        
        alert.resolved = True
        alert.resolved_date = timezone.now()
        alert.is_active = False
        alert.save()
        
        return Response({
            'status': 'resolved',
            'alert': self.get_serializer(alert).data
        })


class ReciprocityAgreementViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing reciprocity agreements"""
    
    serializer_class = ReciprocityAgreementSerializer
    permission_classes = [IsAuthenticated]
    queryset = ReciprocityAgreement.objects.filter(is_active=True)


class ConsolidatedGroupViewSet(viewsets.ModelViewSet):
    """ViewSet for managing consolidated group filings"""
    
    serializer_class = ConsolidatedGroupSerializer
    permission_classes = [IsAuthenticated, TenantPermission]
    
    def get_queryset(self):
        return ConsolidatedGroup.objects.filter(
            tenant=self.request.user.tenant
        )