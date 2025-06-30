from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.utils.decorators import method_decorator
from django.views import View
import json
import io
import tempfile
from datetime import datetime
from typing import Dict, Any

from .form_generator import TaxFormGenerator
from .form_templates import FormTemplateRegistry
from ..models import TaxFiling, TaxFilingDocument


class PDFFormGeneratorView(View):
    """API view for generating PDF tax forms"""
    
    @method_decorator(csrf_exempt)
    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        """Generate PDF form from JSON data"""
        try:
            # Parse request data
            data = json.loads(request.body)
            form_type = data.get('form_type')
            filing_period = data.get('filing_period')
            form_data = data.get('form_data', {})
            is_draft = data.get('is_draft', True)
            include_attachments = data.get('include_attachments', False)
            
            # Validate required fields
            if not form_type:
                return JsonResponse({'error': 'form_type is required'}, status=400)
            if not filing_period:
                return JsonResponse({'error': 'filing_period is required'}, status=400)
            
            # Get template and validate data
            template_class = FormTemplateRegistry.get_template(form_type)
            
            if form_type.startswith('STATE_SALES_'):
                state_code = form_type.replace('STATE_SALES_', '')
                errors = template_class.validate_data(form_data, state_code)
                prepared_data = template_class.prepare_data(form_data, state_code)
            else:
                errors = template_class.validate_data(form_data)
                prepared_data = template_class.prepare_data(form_data)
            
            if errors:
                return JsonResponse({'errors': errors}, status=400)
            
            # Generate PDF
            generator = TaxFormGenerator(form_type, filing_period, is_draft)
            pdf_bytes = generator.generate_form(prepared_data)
            
            # Add attachments if requested
            if include_attachments and 'attachments' in data:
                attachment_pdfs = []
                for attachment_data in data['attachments']:
                    attachment_generator = TaxFormGenerator(
                        attachment_data['form_type'],
                        filing_period,
                        is_draft
                    )
                    attachment_pdf = attachment_generator.generate_form(attachment_data['data'])
                    attachment_pdfs.append(attachment_pdf)
                
                pdf_bytes = generator.add_attachments(pdf_bytes, attachment_pdfs)
            
            # Return as downloadable PDF
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            filename = f"{form_type}_{filing_period}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Content-Length'] = len(pdf_bytes)
            
            return response
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    def get(self, request):
        """Get form template information"""
        form_type = request.GET.get('form_type')
        
        if not form_type:
            # Return list of available forms
            templates = FormTemplateRegistry.list_templates()
            return JsonResponse({'templates': templates})
        
        try:
            template_class = FormTemplateRegistry.get_template(form_type)
            
            if form_type.startswith('STATE_SALES_'):
                state_code = request.GET.get('state_code', 'CA')
                field_mapping = template_class.get_field_mapping(state_code)
            else:
                field_mapping = template_class.get_field_mapping()
            
            return JsonResponse({
                'form_type': form_type,
                'fields': field_mapping
            })
            
        except ValueError as e:
            return JsonResponse({'error': str(e)}, status=400)


class FilingConfirmationView(View):
    """API view for generating filing confirmation pages"""
    
    @method_decorator(csrf_exempt)
    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        """Generate filing confirmation PDF"""
        try:
            data = json.loads(request.body)
            form_type = data.get('form_type')
            filing_period = data.get('filing_period')
            filing_data = data.get('filing_data', {})
            
            if not form_type or not filing_period:
                return JsonResponse({'error': 'form_type and filing_period are required'}, status=400)
            
            # Generate confirmation PDF
            generator = TaxFormGenerator(form_type, filing_period, is_draft=False)
            pdf_bytes = generator.generate_filing_confirmation(filing_data)
            
            # Return as downloadable PDF
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            filename = f"Confirmation_{form_type}_{filing_period}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Content-Length'] = len(pdf_bytes)
            
            return response
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


class FormPreviewView(View):
    """API view for generating form previews (draft versions)"""
    
    @method_decorator(csrf_exempt)
    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        """Generate form preview"""
        try:
            data = json.loads(request.body)
            form_type = data.get('form_type')
            filing_period = data.get('filing_period')
            form_data = data.get('form_data', {})
            
            if not form_type or not filing_period:
                return JsonResponse({'error': 'form_type and filing_period are required'}, status=400)
            
            # Get template and prepare data
            template_class = FormTemplateRegistry.get_template(form_type)
            
            if form_type.startswith('STATE_SALES_'):
                state_code = form_type.replace('STATE_SALES_', '')
                prepared_data = template_class.prepare_data(form_data, state_code)
            else:
                prepared_data = template_class.prepare_data(form_data)
            
            # Generate PDF with draft watermark
            generator = TaxFormGenerator(form_type, filing_period, is_draft=True)
            pdf_bytes = generator.generate_form(prepared_data)
            
            # Return as inline PDF for preview
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = 'inline'
            response['Content-Length'] = len(pdf_bytes)
            
            return response
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


class FormValidationView(View):
    """API view for validating form data without generating PDF"""
    
    @method_decorator(csrf_exempt)
    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        """Validate form data"""
        try:
            data = json.loads(request.body)
            form_type = data.get('form_type')
            form_data = data.get('form_data', {})
            
            if not form_type:
                return JsonResponse({'error': 'form_type is required'}, status=400)
            
            # Get template and validate
            template_class = FormTemplateRegistry.get_template(form_type)
            
            if form_type.startswith('STATE_SALES_'):
                state_code = form_type.replace('STATE_SALES_', '')
                errors = template_class.validate_data(form_data, state_code)
            else:
                errors = template_class.validate_data(form_data)
            
            if errors:
                return JsonResponse({'valid': False, 'errors': errors}, status=400)
            else:
                return JsonResponse({'valid': True, 'message': 'Form data is valid'})
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


class BulkFormGenerationView(View):
    """API view for generating multiple forms at once"""
    
    @method_decorator(csrf_exempt)
    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        """Generate multiple forms and return as ZIP file"""
        try:
            import zipfile
            from django.http import HttpResponse
            
            data = json.loads(request.body)
            forms = data.get('forms', [])
            
            if not forms:
                return JsonResponse({'error': 'No forms specified'}, status=400)
            
            # Create ZIP file in memory
            zip_buffer = io.BytesIO()
            
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for i, form_config in enumerate(forms):
                    form_type = form_config.get('form_type')
                    filing_period = form_config.get('filing_period')
                    form_data = form_config.get('form_data', {})
                    is_draft = form_config.get('is_draft', True)
                    
                    if not form_type or not filing_period:
                        continue
                    
                    # Get template and prepare data
                    template_class = FormTemplateRegistry.get_template(form_type)
                    
                    if form_type.startswith('STATE_SALES_'):
                        state_code = form_type.replace('STATE_SALES_', '')
                        prepared_data = template_class.prepare_data(form_data, state_code)
                    else:
                        prepared_data = template_class.prepare_data(form_data)
                    
                    # Generate PDF
                    generator = TaxFormGenerator(form_type, filing_period, is_draft)
                    pdf_bytes = generator.generate_form(prepared_data)
                    
                    # Add to ZIP
                    filename = f"{form_type}_{filing_period}_{i+1:03d}.pdf"
                    zip_file.writestr(filename, pdf_bytes)
            
            # Return ZIP file
            zip_buffer.seek(0)
            response = HttpResponse(zip_buffer.read(), content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="tax_forms_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip"'
            
            return response
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


class FormScheduleView(View):
    """API view for generating form schedules and attachments"""
    
    @method_decorator(csrf_exempt)
    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        """Generate form schedules"""
        try:
            data = json.loads(request.body)
            main_form_type = data.get('main_form_type')
            schedule_type = data.get('schedule_type')
            filing_period = data.get('filing_period')
            schedule_data = data.get('schedule_data', {})
            is_draft = data.get('is_draft', True)
            
            if not all([main_form_type, schedule_type, filing_period]):
                return JsonResponse({'error': 'main_form_type, schedule_type, and filing_period are required'}, status=400)
            
            # Map schedule types to form types
            schedule_mapping = {
                '941': {
                    'schedule_b': 'SCHEDULE_B_941',
                    'schedule_r': 'SCHEDULE_R_941'
                },
                '940': {
                    'schedule_a': 'SCHEDULE_A_940'
                }
            }
            
            if main_form_type not in schedule_mapping:
                return JsonResponse({'error': f'No schedules available for form {main_form_type}'}, status=400)
            
            if schedule_type not in schedule_mapping[main_form_type]:
                return JsonResponse({'error': f'Schedule {schedule_type} not available for form {main_form_type}'}, status=400)
            
            # Generate schedule PDF
            schedule_form_type = schedule_mapping[main_form_type][schedule_type]
            generator = TaxFormGenerator(schedule_form_type, filing_period, is_draft)
            pdf_bytes = generator.generate_form(schedule_data)
            
            # Return as downloadable PDF
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            filename = f"{schedule_form_type}_{filing_period}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Content-Length'] = len(pdf_bytes)
            
            return response
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    def get(self, request):
        """Get available schedules for a form type"""
        form_type = request.GET.get('form_type')
        
        if not form_type:
            return JsonResponse({'error': 'form_type is required'}, status=400)
        
        schedule_mapping = {
            '941': ['schedule_b', 'schedule_r'],
            '940': ['schedule_a'],
            'STATE_SALES_CA': ['schedule_a', 'schedule_b'],
            'STATE_SALES_NY': ['schedule_a'],
            'STATE_SALES_TX': ['schedule_a']
        }
        
        schedules = schedule_mapping.get(form_type, [])
        return JsonResponse({'form_type': form_type, 'available_schedules': schedules})