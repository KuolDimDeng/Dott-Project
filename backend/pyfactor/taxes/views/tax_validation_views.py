"""
Simple views for tax rate validation and approval
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.http import JsonResponse
from django.utils import timezone

from taxes.models.tax_validation import (
    TaxRateValidationBatch, 
    TaxRateChangeLog,
    GlobalSalesTaxRateStaging
)
from taxes.services.tax_validation_service import TaxRateValidator


def is_admin(user):
    """Check if user can approve tax changes"""
    return user.is_superuser or user.groups.filter(name='TaxAdmins').exists()


@login_required
@user_passes_test(is_admin)
def validation_dashboard(request):
    """Dashboard showing all validation batches"""
    batches = TaxRateValidationBatch.objects.all()[:20]
    
    context = {
        'batches': batches,
        'pending_count': TaxRateValidationBatch.objects.filter(status='pending').count(),
        'critical_count': TaxRateChangeLog.objects.filter(
            severity='critical',
            approved=False
        ).count()
    }
    
    return render(request, 'taxes/validation_dashboard.html', context)


@login_required
@user_passes_test(is_admin)
def batch_detail(request, batch_id):
    """Detail view for a validation batch"""
    batch = get_object_or_404(TaxRateValidationBatch, batch_id=batch_id)
    
    # Get changes grouped by severity
    changes = TaxRateChangeLog.objects.filter(batch_id=batch_id)
    critical_changes = changes.filter(severity='critical')
    warning_changes = changes.filter(severity='warning')
    info_changes = changes.filter(severity='info')
    
    # Get staging records
    staging_records = GlobalSalesTaxRateStaging.objects.filter(batch_id=batch_id)
    
    context = {
        'batch': batch,
        'critical_changes': critical_changes,
        'warning_changes': warning_changes,
        'info_changes': info_changes,
        'staging_count': staging_records.count(),
        'can_approve': batch.status == 'pending',
        'can_apply': batch.status == 'approved'
    }
    
    return render(request, 'taxes/batch_detail.html', context)


@login_required
@user_passes_test(is_admin)
def approve_batch(request, batch_id):
    """Approve a batch for production"""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    
    batch = get_object_or_404(TaxRateValidationBatch, batch_id=batch_id)
    
    if batch.status != 'pending':
        messages.error(request, f"Batch is {batch.status}, cannot approve")
        return redirect('tax-validation:batch-detail', batch_id=batch_id)
    
    # Mark changes as approved
    changes = TaxRateChangeLog.objects.filter(batch_id=batch_id)
    changes.update(
        approved=True,
        approved_by=request.user,
        approved_date=timezone.now()
    )
    
    # Update batch
    batch.status = 'approved'
    batch.reviewed_by = request.user
    batch.reviewed_date = timezone.now()
    batch.review_notes = request.POST.get('notes', '')
    batch.save()
    
    messages.success(request, f"Batch {batch_id} approved successfully")
    return redirect('tax-validation:batch-detail', batch_id=batch_id)


@login_required
@user_passes_test(is_admin)
def apply_batch(request, batch_id):
    """Apply approved changes to production"""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    
    batch = get_object_or_404(TaxRateValidationBatch, batch_id=batch_id)
    
    if batch.status != 'approved':
        messages.error(request, f"Batch must be approved before applying")
        return redirect('tax-validation:batch-detail', batch_id=batch_id)
    
    try:
        validator = TaxRateValidator(batch_id)
        count = validator.apply_approved_changes(batch, request.user)
        messages.success(request, f"Successfully applied {count} changes to production")
    except Exception as e:
        messages.error(request, f"Error applying changes: {e}")
    
    return redirect('tax-validation:batch-detail', batch_id=batch_id)


@login_required
@user_passes_test(is_admin)
def rollback_batch(request, batch_id):
    """Rollback a batch of changes"""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    
    batch = get_object_or_404(TaxRateValidationBatch, batch_id=batch_id)
    
    if not batch.rollback_available:
        messages.error(request, "Rollback not available for this batch")
        return redirect('tax-validation:batch-detail', batch_id=batch_id)
    
    try:
        validator = TaxRateValidator(batch_id)
        validator.rollback_batch(batch)
        messages.success(request, f"Successfully rolled back batch {batch_id}")
    except Exception as e:
        messages.error(request, f"Error rolling back: {e}")
    
    return redirect('tax-validation:validation-dashboard')


@login_required
@user_passes_test(is_admin)
def validation_report_api(request, batch_id):
    """API endpoint for validation report data"""
    batch = get_object_or_404(TaxRateValidationBatch, batch_id=batch_id)
    changes = TaxRateChangeLog.objects.filter(batch_id=batch_id)
    
    # Group changes by country
    by_country = {}
    for change in changes:
        if change.country not in by_country:
            by_country[change.country] = {
                'name': change.country_name,
                'changes': []
            }
        by_country[change.country]['changes'].append({
            'field': change.field_name,
            'old': change.old_value,
            'new': change.new_value,
            'severity': change.severity,
            'change_pct': float(change.change_percentage) if change.change_percentage else None
        })
    
    return JsonResponse({
        'batch': {
            'id': batch.batch_id,
            'status': batch.status,
            'created': batch.created_date.isoformat(),
            'total_changes': batch.total_changes,
            'critical': batch.critical_changes,
            'warning': batch.warning_changes
        },
        'changes_by_country': by_country
    })