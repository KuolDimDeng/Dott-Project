"""
Script to identify and fix all ViewSets that need proper tenant filtering
This ensures all ViewSets follow the same pattern as ProductViewSet
"""

import os
import re

def fix_viewset_get_queryset(file_path, viewset_name):
    """
    Fix a ViewSet's get_queryset method to properly call super()
    """
    print(f"Fixing {viewset_name} in {file_path}")
    
    # The proper get_queryset pattern from ProductViewSet
    proper_pattern = '''    def get_queryset(self):
        """
        Get queryset with proper tenant context - MUST call parent for tenant filtering
        """
        try:
            # CRITICAL: Call parent's get_queryset() which applies tenant filtering
            queryset = super().get_queryset()
            
            # Log the tenant filtering
            tenant_id = getattr(self.request.user, 'tenant_id', None) or \\
                       getattr(self.request.user, 'business_id', None)
            logger.info(f"[{viewset_name}] Tenant filtering applied for tenant: {{tenant_id}}")
            
            # Add any custom filters here if needed
            
            return queryset
            
        except Exception as e:
            logger.error(f"[{viewset_name}] Error getting queryset: {{str(e)}}", exc_info=True)
            # Return empty queryset on error
            return super().get_queryset().none()
'''
    
    return proper_pattern.format(viewset_name=viewset_name)


# ViewSets that need fixing based on the grep results
viewsets_to_fix = [
    # HR Module
    ('hr/views.py', [
        'PerformanceReviewViewSet',
        'PerformanceMetricViewSet', 
        'PerformanceRatingViewSet',
        'PerformanceGoalViewSet',
        'FeedbackRecordViewSet',
        'PerformanceSettingViewSet',
        'TimesheetViewSet',
        'TimesheetEntryViewSet',
        'TimesheetSettingViewSet',
        'TimeOffRequestViewSet',
        'TimeOffBalanceViewSet',
        'BenefitsViewSet',
        'LocationLogViewSet',
        'EmployeeLocationConsentViewSet',
        'LocationCheckInViewSet',
        'GeofenceViewSet',
        'EmployeeGeofenceViewSet',
        'GeofenceEventViewSet'
    ]),
    # Sales Module
    ('sales/viewsets.py', [
        'EstimateViewSet',
        'SalesOrderViewSet'
    ]),
    # Timesheets Module
    ('timesheets/views.py', [
        'TimesheetViewSet',
        'TimeEntryViewSet',
        'ClockEntryViewSet',
        'TimeOffRequestViewSet',
        'GeofenceZoneViewSet'
    ]),
    # Payments Module
    ('payments/views_v2.py', [
        'PaymentGatewayViewSet',
        'PaymentMethodViewSet',
        'TransactionViewSet'
    ])
]

print("ViewSets that need fixing:")
print("=" * 60)
for module, viewsets in viewsets_to_fix:
    print(f"\n{module}:")
    for vs in viewsets:
        print(f"  - {vs}")

print("\n" + "=" * 60)
print("These ViewSets need to have their get_queryset() methods updated")
print("to call super().get_queryset() first, just like ProductViewSet does.")
print("This ensures proper tenant isolation through TenantIsolatedViewSet.")