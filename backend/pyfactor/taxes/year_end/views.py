from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.http import HttpResponse, FileResponse
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import datetime
import logging

from taxes.models import (
    W2Form, W3Form, Form1099NEC, Form1099MISC, Form1096,
    YearEndTaxGeneration
)
from taxes.year_end.serializers import (
    W2FormSerializer, W3FormSerializer, 
    Form1099NECSerializer, Form1099MISCSerializer, Form1096Serializer,
    YearEndTaxGenerationSerializer, VendorTaxSummarySerializer
)
from taxes.year_end.w2_generator import W2Generator
from taxes.year_end.form1099_generator import Form1099Generator
from custom_auth.permissions import TenantAccessPermission

logger = logging.getLogger(__name__)


class W2FormViewSet(viewsets.ModelViewSet):
    """ViewSet for W-2 forms"""
    serializer_class = W2FormSerializer
    permission_classes = [IsAuthenticated, TenantAccessPermission]
    
    def get_queryset(self):
        return W2Form.objects.filter(
            tenant_id=self.request.user.tenant_id
        ).order_by('-tax_year', '-created')
    
    @action(detail=False, methods=['post'])
    def generate_year(self, request):
        """Generate W-2s for all employees for a given year"""
        tax_year = request.data.get('tax_year', datetime.now().year - 1)
        
        # Check if already generated
        existing = W2Form.objects.filter(
            tenant_id=request.user.tenant_id,
            tax_year=tax_year
        ).exists()
        
        if existing and not request.data.get('regenerate', False):
            return Response({
                'error': 'W-2 forms already exist for this year. Set regenerate=true to regenerate.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                # Create generation record
                generation = YearEndTaxGeneration.objects.create(
                    tenant_id=request.user.tenant_id,
                    tax_year=tax_year,
                    generation_type='w2_w3',
                    initiated_by=request.user.email,
                    started_at=timezone.now()
                )
                
                # Generate W-2s
                generator = W2Generator(request.user.tenant_id, tax_year)
                w2_data_list = generator.generate_all_w2s()
                
                # Save W-2 forms
                w2_forms = []
                for w2_data in w2_data_list:
                    w2_form = W2Form.objects.create(
                        tenant_id=request.user.tenant_id,
                        employee_id=w2_data['employee']['employee_id'],
                        tax_year=tax_year,
                        control_number=w2_data['control_number'],
                        wages_tips_other=w2_data['wages']['wages_tips_other'],
                        federal_income_tax_withheld=w2_data['taxes']['federal_withheld'],
                        social_security_wages=w2_data['wages']['social_security_wages'],
                        social_security_tax_withheld=w2_data['taxes']['social_security_withheld'],
                        medicare_wages_tips=w2_data['wages']['medicare_wages'],
                        medicare_tax_withheld=w2_data['taxes']['medicare_withheld'],
                        social_security_tips=w2_data['wages']['social_security_tips'],
                        allocated_tips=w2_data['wages']['allocated_tips'],
                        advance_eic_payment=w2_data['wages']['advance_eic'],
                        dependent_care_benefits=w2_data['wages']['dependent_care'],
                        nonqualified_plans=w2_data['wages']['nonqualified_plans'],
                        box12_codes=w2_data['wages']['box12_codes'],
                        box14_other=w2_data['wages']['box14_other'],
                        state_wages_tips=w2_data['state_data'],
                        status='generated'
                    )
                    w2_forms.append(w2_form)
                
                # Generate W-3 transmittal
                if w2_forms:
                    w3_form = self._generate_w3(request.user.tenant_id, tax_year, w2_data_list)
                    generation.w3_generated = True
                
                # Update generation record
                generation.status = 'completed'
                generation.completed_at = timezone.now()
                generation.w2_count = len(w2_forms)
                generation.total_forms_generated = len(w2_forms)
                generation.save()
                
                return Response({
                    'success': True,
                    'w2_count': len(w2_forms),
                    'w3_generated': bool(w2_forms),
                    'generation_id': str(generation.id)
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Error generating W-2 forms: {str(e)}")
            if 'generation' in locals():
                generation.status = 'failed'
                generation.error_message = str(e)
                generation.save()
            return Response({
                'error': f'Failed to generate W-2 forms: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_w3(self, tenant_id, tax_year, w2_data_list):
        """Generate W-3 transmittal form"""
        generator = W2Generator(tenant_id, tax_year)
        
        # Calculate totals
        totals = {
            'total_forms': len(w2_data_list),
            'total_wages': sum(w2['wages']['wages_tips_other'] for w2 in w2_data_list),
            'total_federal_tax': sum(w2['taxes']['federal_withheld'] for w2 in w2_data_list),
            'total_ss_wages': sum(w2['wages']['social_security_wages'] for w2 in w2_data_list),
            'total_ss_tax': sum(w2['taxes']['social_security_withheld'] for w2 in w2_data_list),
            'total_medicare_wages': sum(w2['wages']['medicare_wages'] for w2 in w2_data_list),
            'total_medicare_tax': sum(w2['taxes']['medicare_withheld'] for w2 in w2_data_list),
            'total_ss_tips': sum(w2['wages']['social_security_tips'] for w2 in w2_data_list),
            'total_allocated_tips': sum(w2['wages']['allocated_tips'] for w2 in w2_data_list),
            'total_advance_eic': sum(w2['wages']['advance_eic'] for w2 in w2_data_list),
            'total_dependent_care': sum(w2['wages']['dependent_care'] for w2 in w2_data_list),
            'total_nonqualified_plans': sum(w2['wages']['nonqualified_plans'] for w2 in w2_data_list),
        }
        
        w3_form = W3Form.objects.create(
            tenant_id=tenant_id,
            tax_year=tax_year,
            control_number=f"W3-{tax_year}-{tenant_id}",
            **totals,
            status='generated'
        )
        
        return w3_form
    
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Download W-2 PDF"""
        w2_form = self.get_object()
        
        # Generate PDF if not already generated
        if not w2_form.pdf_file:
            generator = W2Generator(request.user.tenant_id, w2_form.tax_year)
            
            # Get employee data
            from hr.models import Employee
            employee = Employee.objects.get(id=w2_form.employee_id)
            
            # Create W-2 data structure
            w2_data = {
                'employee': {
                    'ssn': employee.ssn,
                    'name': f"{employee.first_name} {employee.middle_name or ''} {employee.last_name}".strip(),
                    'address': employee.address,
                    'city': employee.city,
                    'state': employee.state,
                    'zip': employee.zip_code,
                    'employee_id': employee.id
                },
                'employer': generator._get_employer_info(),
                'wages': {
                    'wages_tips_other': w2_form.wages_tips_other,
                    'social_security_wages': w2_form.social_security_wages,
                    'medicare_wages': w2_form.medicare_wages_tips,
                    'social_security_tips': w2_form.social_security_tips,
                    'allocated_tips': w2_form.allocated_tips,
                    'advance_eic': w2_form.advance_eic_payment,
                    'dependent_care': w2_form.dependent_care_benefits,
                    'nonqualified_plans': w2_form.nonqualified_plans,
                    'box12_codes': w2_form.box12_codes,
                    'box14_other': w2_form.box14_other
                },
                'taxes': {
                    'federal_withheld': w2_form.federal_income_tax_withheld,
                    'social_security_withheld': w2_form.social_security_tax_withheld,
                    'medicare_withheld': w2_form.medicare_tax_withheld
                },
                'state_data': w2_form.state_wages_tips,
                'tax_year': w2_form.tax_year,
                'control_number': w2_form.control_number
            }
            
            pdf_buffer = generator.generate_w2_pdf(w2_data)
            
            # Save PDF
            from django.core.files.base import ContentFile
            w2_form.pdf_file.save(
                f"W2_{w2_form.tax_year}_{w2_form.employee_id}.pdf",
                ContentFile(pdf_buffer.read()),
                save=True
            )
            w2_form.pdf_generated_at = timezone.now()
            w2_form.save()
        
        # Return PDF file
        return FileResponse(
            w2_form.pdf_file,
            as_attachment=True,
            filename=f"W2_{w2_form.tax_year}_{w2_form.control_number}.pdf"
        )
    
    @action(detail=True, methods=['post'])
    def distribute(self, request, pk=None):
        """Mark W-2 as distributed to employee"""
        w2_form = self.get_object()
        
        w2_form.distributed_to_employee = True
        w2_form.distribution_date = timezone.now()
        w2_form.distribution_method = request.data.get('method', 'portal')
        w2_form.status = 'distributed'
        w2_form.save()
        
        return Response({
            'success': True,
            'distribution_date': w2_form.distribution_date,
            'method': w2_form.distribution_method
        })
    
    @action(detail=True, methods=['post'])
    def correct(self, request, pk=None):
        """Create a corrected W-2"""
        original_w2 = self.get_object()
        
        # Create corrected W-2
        corrected_w2 = W2Form.objects.create(
            tenant_id=original_w2.tenant_id,
            employee_id=original_w2.employee_id,
            tax_year=original_w2.tax_year,
            control_number=f"{original_w2.control_number}-C",
            wages_tips_other=request.data.get('wages_tips_other', original_w2.wages_tips_other),
            federal_income_tax_withheld=request.data.get('federal_income_tax_withheld', original_w2.federal_income_tax_withheld),
            social_security_wages=request.data.get('social_security_wages', original_w2.social_security_wages),
            social_security_tax_withheld=request.data.get('social_security_tax_withheld', original_w2.social_security_tax_withheld),
            medicare_wages_tips=request.data.get('medicare_wages_tips', original_w2.medicare_wages_tips),
            medicare_tax_withheld=request.data.get('medicare_tax_withheld', original_w2.medicare_tax_withheld),
            is_correction=True,
            original_w2_id=original_w2.id,
            status='generated'
        )
        
        # Mark original as corrected
        original_w2.status = 'corrected'
        original_w2.save()
        
        serializer = self.get_serializer(corrected_w2)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class Form1099ViewSet(viewsets.ModelViewSet):
    """ViewSet for 1099 forms"""
    permission_classes = [IsAuthenticated, TenantAccessPermission]
    
    def get_queryset(self):
        tenant_id = self.request.user.tenant_id
        form_type = self.request.query_params.get('form_type', '1099-NEC')
        
        if form_type == '1099-NEC':
            return Form1099NEC.objects.filter(tenant_id=tenant_id)
        elif form_type == '1099-MISC':
            return Form1099MISC.objects.filter(tenant_id=tenant_id)
        else:
            # Return union of all 1099 forms
            return Form1099NEC.objects.filter(tenant_id=tenant_id)
    
    def get_serializer_class(self):
        form_type = self.request.query_params.get('form_type', '1099-NEC')
        if form_type == '1099-NEC':
            return Form1099NECSerializer
        else:
            return Form1099MISCSerializer
    
    @action(detail=False, methods=['post'])
    def generate_year(self, request):
        """Generate 1099s for all vendors for a given year"""
        tax_year = request.data.get('tax_year', datetime.now().year - 1)
        
        try:
            with transaction.atomic():
                # Create generation record
                generation = YearEndTaxGeneration.objects.create(
                    tenant_id=request.user.tenant_id,
                    tax_year=tax_year,
                    generation_type='1099',
                    initiated_by=request.user.email,
                    started_at=timezone.now()
                )
                
                # Generate 1099s
                generator = Form1099Generator(request.user.tenant_id, tax_year)
                forms_data = generator.generate_all_1099s()
                
                # Save 1099-NEC forms
                nec_forms = []
                for form_data in forms_data['1099-NEC']:
                    form = Form1099NEC.objects.create(
                        tenant_id=request.user.tenant_id,
                        vendor_id=form_data['recipient']['vendor_id'],
                        tax_year=tax_year,
                        form_type='1099-NEC',
                        recipient_tin=form_data['recipient']['tin'],
                        recipient_name=form_data['recipient']['name'],
                        recipient_address=form_data['recipient'],
                        nonemployee_compensation=form_data['amounts']['box1_nonemployee_compensation'],
                        federal_tax_withheld=form_data['amounts']['box4_federal_tax_withheld'],
                        state_tax_info=form_data.get('state_info', []),
                        status='generated'
                    )
                    nec_forms.append(form)
                
                # Save 1099-MISC forms
                misc_forms = []
                for form_data in forms_data['1099-MISC']:
                    form = Form1099MISC.objects.create(
                        tenant_id=request.user.tenant_id,
                        vendor_id=form_data['recipient']['vendor_id'],
                        tax_year=tax_year,
                        form_type='1099-MISC',
                        recipient_tin=form_data['recipient']['tin'],
                        recipient_name=form_data['recipient']['name'],
                        recipient_address=form_data['recipient'],
                        rents=form_data['amounts'].get('box1_rents', 0),
                        royalties=form_data['amounts'].get('box2_royalties', 0),
                        other_income=form_data['amounts'].get('box3_other_income', 0),
                        medical_healthcare_payments=form_data['amounts'].get('box6_medical', 0),
                        gross_proceeds_attorney=form_data['amounts'].get('box14_attorney', 0),
                        federal_tax_withheld=form_data.get('box4_federal_tax_withheld', 0),
                        state_tax_info=form_data.get('state_info', []),
                        status='generated'
                    )
                    misc_forms.append(form)
                
                # Generate 1096 transmittal if forms exist
                if nec_forms or misc_forms:
                    self._generate_1096(request.user.tenant_id, tax_year, forms_data)
                    generation.form_1096_generated = True
                
                # Update generation record
                generation.status = 'completed'
                generation.completed_at = timezone.now()
                generation.form_1099_nec_count = len(nec_forms)
                generation.form_1099_misc_count = len(misc_forms)
                generation.total_forms_generated = len(nec_forms) + len(misc_forms)
                generation.save()
                
                return Response({
                    'success': True,
                    '1099_nec_count': len(nec_forms),
                    '1099_misc_count': len(misc_forms),
                    '1096_generated': bool(nec_forms or misc_forms),
                    'generation_id': str(generation.id)
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Error generating 1099 forms: {str(e)}")
            if 'generation' in locals():
                generation.status = 'failed'
                generation.error_message = str(e)
                generation.save()
            return Response({
                'error': f'Failed to generate 1099 forms: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_1096(self, tenant_id, tax_year, forms_data):
        """Generate 1096 transmittal form"""
        from custom_auth.models import Business, Tenant
        
        business = Business.objects.filter(tenant_id=tenant_id).first()
        tenant = Tenant.objects.get(id=tenant_id)
        
        # Count forms and calculate totals
        form_types = []
        total_forms = 0
        total_amount = 0
        
        if forms_data['1099-NEC']:
            form_types.append('1099-NEC')
            total_forms += len(forms_data['1099-NEC'])
            total_amount += sum(f['amounts']['box1_nonemployee_compensation'] for f in forms_data['1099-NEC'])
        
        if forms_data['1099-MISC']:
            form_types.append('1099-MISC')
            total_forms += len(forms_data['1099-MISC'])
            for form in forms_data['1099-MISC']:
                total_amount += sum(form['amounts'].values())
        
        Form1096.objects.create(
            tenant_id=tenant_id,
            tax_year=tax_year,
            form_types_included=form_types,
            total_forms=total_forms,
            total_amount_reported=total_amount,
            filer_name=business.name if business else tenant.company_name,
            filer_address={
                'street': business.address if business else '',
                'city': business.city if business else '',
                'state': business.state if business else '',
                'zip': business.zip_code if business else ''
            },
            filer_tin=business.ein if business else '',
            contact_name=tenant.contact_name or '',
            contact_phone=tenant.contact_phone or '',
            contact_email=tenant.contact_email or '',
            status='generated'
        )
    
    @action(detail=False, methods=['get'])
    def vendors_requiring_1099(self, request):
        """Get list of vendors that require 1099 forms"""
        tax_year = int(request.query_params.get('tax_year', datetime.now().year - 1))
        
        generator = Form1099Generator(request.user.tenant_id, tax_year)
        vendors_list = generator.get_vendors_requiring_1099()
        
        serializer = VendorTaxSummarySerializer(vendors_list, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Download 1099 PDF"""
        form_1099 = self.get_object()
        
        # Generate PDF if not already generated
        if not form_1099.pdf_file:
            generator = Form1099Generator(request.user.tenant_id, form_1099.tax_year)
            
            # Create form data structure
            form_data = {
                'form_type': form_1099.form_type,
                'tax_year': form_1099.tax_year,
                'payer': generator._get_payer_info(),
                'recipient': {
                    'name': form_1099.recipient_name,
                    'tin': form_1099.recipient_tin,
                    'address': form_1099.recipient_address.get('street', ''),
                    'city': form_1099.recipient_address.get('city', ''),
                    'state': form_1099.recipient_address.get('state', ''),
                    'zip': form_1099.recipient_address.get('zip', ''),
                    'account_number': form_1099.account_number
                },
                'amounts': {},
                'corrected': form_1099.corrected,
                'void': form_1099.void,
                'state_info': form_1099.state_tax_info
            }
            
            # Add form-specific amounts
            if isinstance(form_1099, Form1099NEC):
                form_data['amounts'] = {
                    'box1_nonemployee_compensation': form_1099.nonemployee_compensation,
                    'box4_federal_tax_withheld': form_1099.federal_tax_withheld,
                    'box5_state_tax_withheld': form_1099.state_tax_info[0].get('state_tax_withheld', 0) if form_1099.state_tax_info else 0,
                    'box6_state_income': form_1099.nonemployee_compensation
                }
            elif isinstance(form_1099, Form1099MISC):
                form_data['amounts'] = {
                    'box1_rents': form_1099.rents,
                    'box2_royalties': form_1099.royalties,
                    'box3_other_income': form_1099.other_income,
                    'box4_federal_tax_withheld': form_1099.federal_tax_withheld,
                    'box6_medical': form_1099.medical_healthcare_payments,
                    'box14_attorney': form_1099.gross_proceeds_attorney
                }
            
            pdf_buffer = generator.generate_1099_pdf(form_data)
            
            # Save PDF
            from django.core.files.base import ContentFile
            form_1099.pdf_file.save(
                f"{form_1099.form_type}_{form_1099.tax_year}_{form_1099.vendor_id}.pdf",
                ContentFile(pdf_buffer.read()),
                save=True
            )
            form_1099.pdf_generated_at = timezone.now()
            form_1099.save()
        
        # Return PDF file
        return FileResponse(
            form_1099.pdf_file,
            as_attachment=True,
            filename=f"{form_1099.form_type}_{form_1099.tax_year}_{form_1099.recipient_name}.pdf"
        )


class YearEndTaxGenerationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for tracking year-end tax generation batches"""
    serializer_class = YearEndTaxGenerationSerializer
    permission_classes = [IsAuthenticated, TenantAccessPermission]
    
    def get_queryset(self):
        return YearEndTaxGeneration.objects.filter(
            tenant_id=self.request.user.tenant_id
        ).order_by('-created')
    
    @action(detail=False, methods=['post'])
    def generate_all(self, request):
        """Generate all year-end tax forms (W-2s and 1099s)"""
        tax_year = request.data.get('tax_year', datetime.now().year - 1)
        
        try:
            with transaction.atomic():
                # Create generation record
                generation = YearEndTaxGeneration.objects.create(
                    tenant_id=request.user.tenant_id,
                    tax_year=tax_year,
                    generation_type='all',
                    initiated_by=request.user.email,
                    started_at=timezone.now()
                )
                
                results = {
                    'w2_count': 0,
                    'w3_generated': False,
                    '1099_nec_count': 0,
                    '1099_misc_count': 0,
                    '1096_generated': False
                }
                
                # Generate W-2s
                try:
                    w2_view = W2FormViewSet()
                    w2_view.request = request
                    w2_response = w2_view.generate_year(request)
                    if w2_response.status_code == 201:
                        results['w2_count'] = w2_response.data['w2_count']
                        results['w3_generated'] = w2_response.data['w3_generated']
                except Exception as e:
                    logger.error(f"Error generating W-2s: {str(e)}")
                
                # Generate 1099s
                try:
                    form_1099_view = Form1099ViewSet()
                    form_1099_view.request = request
                    form_1099_response = form_1099_view.generate_year(request)
                    if form_1099_response.status_code == 201:
                        results['1099_nec_count'] = form_1099_response.data['1099_nec_count']
                        results['1099_misc_count'] = form_1099_response.data['1099_misc_count']
                        results['1096_generated'] = form_1099_response.data['1096_generated']
                except Exception as e:
                    logger.error(f"Error generating 1099s: {str(e)}")
                
                # Update generation record
                generation.status = 'completed'
                generation.completed_at = timezone.now()
                generation.w2_count = results['w2_count']
                generation.w3_generated = results['w3_generated']
                generation.form_1099_nec_count = results['1099_nec_count']
                generation.form_1099_misc_count = results['1099_misc_count']
                generation.form_1096_generated = results['1096_generated']
                generation.total_forms_generated = (
                    results['w2_count'] + 
                    results['1099_nec_count'] + 
                    results['1099_misc_count']
                )
                generation.save()
                
                return Response({
                    'success': True,
                    'generation_id': str(generation.id),
                    **results
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Error generating year-end tax forms: {str(e)}")
            if 'generation' in locals():
                generation.status = 'failed'
                generation.error_message = str(e)
                generation.save()
            return Response({
                'error': f'Failed to generate year-end tax forms: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)