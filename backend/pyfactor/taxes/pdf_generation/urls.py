from django.urls import path
from . import views

app_name = 'pdf_generation'

urlpatterns = [
    # Main PDF generation endpoint
    path('generate/', views.PDFFormGeneratorView.as_view(), name='generate_form'),
    
    # Form preview (draft with watermark)
    path('preview/', views.FormPreviewView.as_view(), name='preview_form'),
    
    # Form validation without PDF generation
    path('validate/', views.FormValidationView.as_view(), name='validate_form'),
    
    # Filing confirmation pages
    path('confirmation/', views.FilingConfirmationView.as_view(), name='filing_confirmation'),
    
    # Bulk form generation (returns ZIP)
    path('bulk/', views.BulkFormGenerationView.as_view(), name='bulk_generate'),
    
    # Form schedules and attachments
    path('schedules/', views.FormScheduleView.as_view(), name='form_schedules'),
]