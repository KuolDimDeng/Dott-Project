from django.contrib import admin
from .models import Job, JobMaterial, JobLabor, JobExpense, JobInvoice

@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['job_number', 'name', 'customer', 'status', 'scheduled_date', 'get_total_billable_amount']
    list_filter = ['status', 'scheduled_date', 'created_at']
    search_fields = ['job_number', 'name', 'customer__name']
    readonly_fields = ['created_at', 'updated_at', 'get_total_materials_cost', 
                      'get_total_labor_cost', 'get_total_cost', 'get_total_billable_amount']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('job_number', 'name', 'description', 'customer', 'status')
        }),
        ('Dates', {
            'fields': ('quote_date', 'scheduled_date', 'start_date', 'completion_date')
        }),
        ('Financial', {
            'fields': ('quoted_amount', 'labor_rate', 'get_total_materials_cost', 
                      'get_total_labor_cost', 'get_total_cost', 'get_total_billable_amount')
        }),
        ('Assignment', {
            'fields': ('created_by', 'assigned_to')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )

@admin.register(JobMaterial)
class JobMaterialAdmin(admin.ModelAdmin):
    list_display = ['job', 'material', 'quantity', 'unit_cost', 'unit_price', 'is_billable']
    list_filter = ['is_billable', 'used_date']
    search_fields = ['job__job_number', 'material__name']

@admin.register(JobLabor)
class JobLaborAdmin(admin.ModelAdmin):
    list_display = ['job', 'employee', 'work_date', 'hours', 'hourly_rate', 'is_billable']
    list_filter = ['is_billable', 'is_overtime', 'work_date']
    search_fields = ['job__job_number', 'employee__user__email']

@admin.register(JobExpense)
class JobExpenseAdmin(admin.ModelAdmin):
    list_display = ['job', 'expense_type', 'description', 'amount', 'is_billable']
    list_filter = ['expense_type', 'is_billable', 'expense_date']
    search_fields = ['job__job_number', 'description']

@admin.register(JobInvoice)
class JobInvoiceAdmin(admin.ModelAdmin):
    list_display = ['job', 'invoice', 'includes_materials', 'includes_labor', 'includes_expenses']
    search_fields = ['job__job_number', 'invoice__invoice_number']