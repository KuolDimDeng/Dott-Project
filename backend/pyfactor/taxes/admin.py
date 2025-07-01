# taxes/admin.py
from django.contrib import admin
from django.urls import path
from django.shortcuts import render, redirect
from django.contrib import messages
from django.http import HttpResponse
import csv
from io import StringIO

from .models import (
    State, IncomeTaxRate, PayrollTaxFiling, 
    TaxApiTransaction, TaxFilingInstruction,
    TaxFiling, FilingDocument, FilingStatusHistory,
    TaxForm, StateFilingRequirement, FilingCalculation,
    FilingPayment
)
from .forms import IncomeTaxRateForm, BulkTaxRateUpdateForm

@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'full_service_enabled', 'e_file_supported', 'is_active')
    list_filter = ('full_service_enabled', 'e_file_supported', 'is_active')
    search_fields = ('name', 'code')
    actions = ['enable_full_service', 'disable_full_service']
    
    def enable_full_service(self, request, queryset):
        queryset.update(full_service_enabled=True)
        self.message_user(request, f"Enabled full service for {queryset.count()} states")
    enable_full_service.short_description = "Enable full service for selected states"
    
    def disable_full_service(self, request, queryset):
        queryset.update(full_service_enabled=False)
        self.message_user(request, f"Disabled full service for {queryset.count()} states")
    disable_full_service.short_description = "Disable full service for selected states"

@admin.register(IncomeTaxRate)
class IncomeTaxRateAdmin(admin.ModelAdmin):
    list_display = ('state', 'tax_year', 'filing_status', 'is_flat_rate', 
                   'rate_display', 'income_range', 'effective_date', 'last_updated')
    list_filter = ('state', 'tax_year', 'filing_status', 'is_flat_rate', 'manual_override')
    search_fields = ('state__name', 'state__code')
    form = IncomeTaxRateForm
    actions = ['export_to_csv']
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('bulk-update/', self.admin_site.admin_view(self.bulk_update_view), 
                name='taxes_incometaxrate_bulk_update'),
            path('export-template/', self.admin_site.admin_view(self.export_template_view), 
                name='taxes_incometaxrate_export_template'),
        ]
        return custom_urls + urls
    
    def rate_display(self, obj):
        return f"{obj.rate_value * 100:.2f}%"
    rate_display.short_description = "Tax Rate"
    
    def income_range(self, obj):
        if obj.is_flat_rate:
            return "Flat Rate"
        elif obj.income_max:
            return f"${obj.income_min:,.2f} - ${obj.income_max:,.2f}"
        else:
            return f"${obj.income_min:,.2f}+"
    income_range.short_description = "Income Range"
    
    def export_to_csv(self, request, queryset):
        meta = self.model._meta
        field_names = [field.name for field in meta.fields]
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename=tax_rates.csv'
        writer = csv.writer(response)
        
        writer.writerow(field_names)
        for obj in queryset:
            row = [getattr(obj, field) for field in field_names]
            writer.writerow(row)
            
        return response
    export_to_csv.short_description = "Export selected rates to CSV"
    
    def bulk_update_view(self, request):
        if request.method == "POST":
            form = BulkTaxRateUpdateForm(request.POST, request.FILES)
            if form.is_valid():
                state = form.cleaned_data['state']
                tax_year = form.cleaned_data['tax_year']
                csv_file = request.FILES['csv_file']
                
                # Process CSV file
                csv_data = csv_file.read().decode('utf-8')
                csv_reader = csv.DictReader(StringIO(csv_data))
                
                created_count = 0
                updated_count = 0
                error_count = 0
                
                for row in csv_reader:
                    try:
                        # Clean and validate the data
                        is_flat_rate = row.get('is_flat_rate', '').lower() in ('true', 'yes', '1')
                        filing_status = row.get('filing_status', 'single')
                        rate_value = float(row.get('rate_value', 0))
                        
                        # Handle income ranges
                        income_min = row.get('income_min')
                        income_max = row.get('income_max')
                        
                        if income_min:
                            income_min = float(income_min)
                        else:
                            income_min = None
                            
                        if income_max:
                            income_max = float(income_max)
                        else:
                            income_max = None
                            
                        # Try to find existing rate
                        existing = IncomeTaxRate.objects.filter(
                            state=state,
                            tax_year=tax_year,
                            filing_status=filing_status,
                            income_min=income_min
                        ).first()
                        
                        if existing:
                            # Update existing
                            existing.is_flat_rate = is_flat_rate
                            existing.rate_value = rate_value
                            existing.income_max = income_max
                            existing.manual_override = True
                            existing.save()
                            updated_count += 1
                        else:
                            # Create new
                            IncomeTaxRate.objects.create(
                                state=state,
                                tax_year=tax_year,
                                filing_status=filing_status,
                                is_flat_rate=is_flat_rate,
                                rate_value=rate_value,
                                income_min=income_min,
                                income_max=income_max,
                                effective_date=row.get('effective_date') or '2023-01-01',
                                manual_override=True
                            )
                            created_count += 1
                    except Exception as e:
                        error_count += 1
                        
                messages.success(request, 
                                f"Processed tax rates: {created_count} created, {updated_count} updated, {error_count} errors")
                return redirect('..')
        else:
            form = BulkTaxRateUpdateForm()
            
        return render(request, 'admin/taxes/incometaxrate/bulk_update.html', {
            'form': form,
            'title': 'Bulk Update Tax Rates'
        })
        
    def export_template_view(self, request):
        """Export a CSV template for bulk updates"""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename=tax_rate_template.csv'
        
        writer = csv.writer(response)
        writer.writerow(['filing_status', 'is_flat_rate', 'rate_value', 'income_min', 'income_max', 'effective_date'])
        
        # Example rows
        writer.writerow(['single', 'True', '0.05', '', '', '2023-01-01'])  # Flat rate
        writer.writerow(['married_joint', 'False', '0.03', '0', '10000', '2023-01-01'])  # Progressive
        writer.writerow(['married_joint', 'False', '0.05', '10000', '50000', '2023-01-01'])  # Progressive
        writer.writerow(['married_joint', 'False', '0.07', '50000', '', '2023-01-01'])  # Progressive highest
        
        return response

@admin.register(PayrollTaxFiling)
class PayrollTaxFilingAdmin(admin.ModelAdmin):
    list_display = ('id', 'state', 'business_id', 'filing_period_range', 
                   'filing_status', 'submission_method', 'total_withholding', 'submission_date')
    list_filter = ('state', 'filing_status', 'submission_method', 'filing_period_start')
    search_fields = ('business_id', 'confirmation_number', 'notes')
    readonly_fields = ('submission_date',)
    
    def filing_period_range(self, obj):
        return f"{obj.filing_period_start} to {obj.filing_period_end}"
    filing_period_range.short_description = "Filing Period"

@admin.register(TaxApiTransaction)
class TaxApiTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'state', 'transaction_date', 'endpoint', 'status_code', 
                   'success', 'processing_time_ms')
    list_filter = ('state', 'success', 'transaction_date')
    search_fields = ('endpoint', 'request_payload', 'response_payload', 'error_message')
    readonly_fields = ('transaction_date', 'processing_time_ms')

@admin.register(TaxFilingInstruction)
class TaxFilingInstructionAdmin(admin.ModelAdmin):
    list_display = ('state', 'filing_frequency', 'due_days', 'portal_url', 'last_updated')
    list_filter = ('filing_frequency',)
    search_fields = ('state__name', 'state__code', 'instructions')


@admin.register(TaxFiling)
class TaxFilingAdmin(admin.ModelAdmin):
    list_display = [
        'filing_id_short', 'tax_type', 'service_type', 'status_badge',
        'filing_period', 'due_date', 'price', 'user_email', 'created'
    ]
    list_filter = [
        'status', 'tax_type', 'service_type', 'payment_status',
        'filing_year', 'created'
    ]
    search_fields = [
        'filing_id', 'user_email', 'preparer_email',
        'confirmation_number', 'filing_period'
    ]
    readonly_fields = [
        'filing_id', 'created', 'updated',
        'payment_completed_at', 'submitted_at', 'accepted_at'
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'filing_id', 'tenant_id', 'tax_type', 'service_type',
                'status', 'filing_period', 'filing_year', 'due_date'
            )
        }),
        ('Pricing & Payment', {
            'fields': (
                'price', 'complexity_multiplier', 'payment_status',
                'payment_session_id', 'payment_completed_at'
            )
        }),
        ('Filing Details', {
            'fields': (
                'submitted_at', 'accepted_at', 'confirmation_number',
                'total_sales', 'taxable_sales', 'tax_collected', 'tax_due'
            )
        }),
        ('User Information', {
            'fields': ('user_email', 'preparer_email')
        }),
        ('Notes', {
            'fields': ('notes', 'internal_notes'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('filing_data', 'locations', 'created', 'updated'),
            'classes': ('collapse',)
        })
    )
    
    def filing_id_short(self, obj):
        return str(obj.filing_id)[:8] + "..."
    filing_id_short.short_description = "Filing ID"
    
    def status_badge(self, obj):
        from django.utils.html import format_html
        colors = {
            'payment_pending': 'orange',
            'payment_completed': 'blue',
            'documents_pending': 'yellow',
            'in_preparation': 'purple',
            'ready_for_review': 'cyan',
            'submitted': 'green',
            'accepted': 'darkgreen',
            'rejected': 'red',
            'completed': 'darkgreen',
            'cancelled': 'gray'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = "Status"
    
    actions = ['mark_as_paid', 'mark_as_submitted', 'cancel_filing']
    
    def mark_as_paid(self, request, queryset):
        for filing in queryset:
            filing.mark_paid()
        self.message_user(request, f"{queryset.count()} filings marked as paid.")
    mark_as_paid.short_description = "Mark selected filings as paid"
    
    def mark_as_submitted(self, request, queryset):
        from django.utils import timezone
        queryset.update(
            status='submitted',
            submitted_at=timezone.now()
        )
        self.message_user(request, f"{queryset.count()} filings marked as submitted.")
    mark_as_submitted.short_description = "Mark selected filings as submitted"
    
    def cancel_filing(self, request, queryset):
        cancelled = 0
        for filing in queryset:
            if filing.can_cancel():
                filing.status = 'cancelled'
                filing.save()
                cancelled += 1
        self.message_user(request, f"{cancelled} filings cancelled.")
    cancel_filing.short_description = "Cancel selected filings"


@admin.register(FilingDocument)
class FilingDocumentAdmin(admin.ModelAdmin):
    list_display = [
        'file_name', 'document_type', 'filing_link',
        'file_size_mb', 'is_verified', 'uploaded_by', 'created_at'
    ]
    list_filter = ['document_type', 'is_verified', 'created_at']
    search_fields = ['file_name', 'uploaded_by', 'filing__filing_id']
    readonly_fields = ['id', 'created_at', 'updated_at', 'verified_at']
    
    def filing_link(self, obj):
        from django.utils.html import format_html
        from django.urls import reverse
        url = reverse('admin:taxes_taxfiling_change', args=[obj.filing.filing_id])
        return format_html('<a href="{}">{}</a>', url, str(obj.filing.filing_id)[:8] + "...")
    filing_link.short_description = "Filing"
    
    def file_size_mb(self, obj):
        return f"{obj.file_size / 1024 / 1024:.2f} MB"
    file_size_mb.short_description = "Size"
    
    actions = ['verify_documents']
    
    def verify_documents(self, request, queryset):
        from django.utils import timezone
        queryset.update(
            is_verified=True,
            verified_by=request.user.email,
            verified_at=timezone.now()
        )
        self.message_user(request, f"{queryset.count()} documents verified.")
    verify_documents.short_description = "Verify selected documents"