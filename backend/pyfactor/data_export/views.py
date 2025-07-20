import io
import json
from datetime import datetime, timedelta
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from session_manager.models import SessionModel
from custom_auth.api.views.authentication_utils import get_user_from_session_token
import pandas as pd
from openpyxl import Workbook
from openpyxl.utils.dataframe import dataframe_to_rows
from openpyxl.styles import Font, PatternFill, Alignment

from products.models import Product
from customers.models import Customer
from invoices.models import Invoice, InvoiceItem
from bills.models import Bill, BillItem
from vendors.models import Vendor
from hr.models import Employee
from taxes.models import TaxRate
from accounting.models import Account
from custom_auth.models import UserProfile


class DataExportView(View):
    """Handle data export requests with proper tenant isolation"""
    
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        """Export data based on selected types and format"""
        try:
            # Get session token from cookie
            session_token = request.COOKIES.get('session_token')
            if not session_token:
                return JsonResponse({'error': 'No session token provided'}, status=401)
            
            # Get user from session token
            user = get_user_from_session_token(session_token)
            if not user:
                return JsonResponse({'error': 'Invalid session'}, status=401)
            
            # Get user profile for tenant_id
            try:
                profile = UserProfile.objects.get(user=user)
                tenant_id = profile.tenant_id
            except UserProfile.DoesNotExist:
                return JsonResponse({'error': 'User profile not found'}, status=404)
            
            # Check RBAC permissions
            if profile.role not in ['OWNER', 'ADMIN']:
                return JsonResponse({'error': 'Insufficient permissions. Only OWNER or ADMIN can export data.'}, status=403)
            
            # Parse request body
            body = json.loads(request.body)
            data_types = body.get('dataTypes', [])
            export_format = body.get('format', 'excel')
            date_range = body.get('dateRange', 'all')
            custom_date_range = body.get('customDateRange', {})
            
            print(f"[DataExportView] Processing export for tenant {tenant_id}")
            print(f"[DataExportView] Data types: {data_types}")
            print(f"[DataExportView] Format: {export_format}")
            
            # Collect data for each type
            export_data = {}
            
            for data_type in data_types:
                if data_type == 'products':
                    queryset = Product.objects.filter(tenant_id=tenant_id)
                    data = list(queryset.values(
                        'name', 'sku', 'description', 'unit_price', 'cost_price',
                        'category', 'quantity_on_hand', 'reorder_level', 'tax_rate',
                        'barcode', 'supplier', 'location', 'is_active'
                    ))
                    export_data['Products'] = data
                    
                elif data_type == 'services':
                    queryset = Product.objects.filter(tenant_id=tenant_id, product_type='SERVICE')
                    data = list(queryset.values(
                        'name', 'sku', 'description', 'unit_price', 
                        'category', 'tax_rate', 'is_active'
                    ))
                    export_data['Services'] = data
                    
                elif data_type == 'customers':
                    queryset = Customer.objects.filter(tenant_id=tenant_id)
                    data = list(queryset.values(
                        'name', 'email', 'phone', 'company_name',
                        'address_line1', 'address_line2', 'city', 'state',
                        'postal_code', 'country', 'credit_limit', 'is_active'
                    ))
                    export_data['Customers'] = data
                    
                elif data_type == 'invoices':
                    queryset = Invoice.objects.filter(tenant_id=tenant_id)
                    
                    # Apply date filters
                    if date_range != 'all':
                        queryset = self._apply_date_filter(queryset, date_range, custom_date_range)
                    
                    data = []
                    for invoice in queryset:
                        invoice_data = {
                            'invoice_number': invoice.invoice_number,
                            'customer': invoice.customer.name if invoice.customer else '',
                            'date': invoice.date.strftime('%Y-%m-%d'),
                            'due_date': invoice.due_date.strftime('%Y-%m-%d') if invoice.due_date else '',
                            'subtotal': float(invoice.subtotal),
                            'tax_amount': float(invoice.tax_amount),
                            'total': float(invoice.total),
                            'paid_amount': float(invoice.paid_amount),
                            'balance': float(invoice.balance),
                            'status': invoice.status,
                        }
                        data.append(invoice_data)
                    export_data['Invoices'] = data
                    
                elif data_type == 'bills':
                    queryset = Bill.objects.filter(tenant_id=tenant_id)
                    
                    # Apply date filters
                    if date_range != 'all':
                        queryset = self._apply_date_filter(queryset, date_range, custom_date_range)
                    
                    data = []
                    for bill in queryset:
                        bill_data = {
                            'bill_number': bill.bill_number,
                            'vendor': bill.vendor.name if bill.vendor else '',
                            'date': bill.date.strftime('%Y-%m-%d'),
                            'due_date': bill.due_date.strftime('%Y-%m-%d') if bill.due_date else '',
                            'subtotal': float(bill.subtotal),
                            'tax_amount': float(bill.tax_amount),
                            'total': float(bill.total),
                            'paid_amount': float(bill.paid_amount),
                            'balance': float(bill.balance),
                            'status': bill.status,
                        }
                        data.append(bill_data)
                    export_data['Bills'] = data
                    
                elif data_type == 'vendors':
                    queryset = Vendor.objects.filter(tenant_id=tenant_id)
                    data = list(queryset.values(
                        'name', 'email', 'phone', 'company_name',
                        'address_line1', 'address_line2', 'city', 'state',
                        'postal_code', 'country', 'payment_terms', 'is_active'
                    ))
                    export_data['Vendors'] = data
                    
                elif data_type == 'employees':
                    queryset = Employee.objects.filter(tenant_id=tenant_id)
                    data = list(queryset.values(
                        'employee_id', 'first_name', 'last_name', 'email',
                        'phone', 'department', 'position', 'hire_date',
                        'employment_status', 'pay_rate', 'pay_frequency'
                    ))
                    export_data['Employees'] = data
                    
                elif data_type == 'tax-rates':
                    queryset = TaxRate.objects.filter(tenant_id=tenant_id)
                    data = list(queryset.values(
                        'name', 'rate', 'tax_type', 'jurisdiction',
                        'description', 'is_active'
                    ))
                    export_data['Tax Rates'] = data
                    
                elif data_type == 'chart-of-accounts':
                    queryset = Account.objects.filter(tenant_id=tenant_id)
                    data = list(queryset.values(
                        'code', 'name', 'account_type', 'description',
                        'parent_account', 'is_active', 'balance'
                    ))
                    export_data['Chart of Accounts'] = data
            
            # Generate the file based on format
            if export_format == 'excel':
                response = self._generate_excel_file(export_data)
            elif export_format == 'csv':
                # For CSV, export only the first data type
                first_key = list(export_data.keys())[0] if export_data else None
                if first_key:
                    response = self._generate_csv_file(export_data[first_key], first_key)
                else:
                    return JsonResponse({'error': 'No data to export'}, status=400)
            else:
                return JsonResponse({'error': f'Format {export_format} not supported'}, status=400)
            
            # Set filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"dott_export_{timestamp}.{export_format if export_format != 'excel' else 'xlsx'}"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            print(f"[DataExportView] Error: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    def _apply_date_filter(self, queryset, date_range, custom_date_range):
        """Apply date filters to queryset"""
        now = datetime.now()
        
        if date_range == 'thisMonth':
            start_date = datetime(now.year, now.month, 1)
            queryset = queryset.filter(date__gte=start_date)
        elif date_range == 'lastMonth':
            if now.month == 1:
                start_date = datetime(now.year - 1, 12, 1)
                end_date = datetime(now.year - 1, 12, 31)
            else:
                start_date = datetime(now.year, now.month - 1, 1)
                end_date = datetime(now.year, now.month, 1) - timedelta(days=1)
            queryset = queryset.filter(date__gte=start_date, date__lte=end_date)
        elif date_range == 'thisQuarter':
            quarter_month = ((now.month - 1) // 3) * 3 + 1
            start_date = datetime(now.year, quarter_month, 1)
            queryset = queryset.filter(date__gte=start_date)
        elif date_range == 'thisYear':
            start_date = datetime(now.year, 1, 1)
            queryset = queryset.filter(date__gte=start_date)
        elif date_range == 'custom':
            if custom_date_range.get('start'):
                queryset = queryset.filter(date__gte=custom_date_range['start'])
            if custom_date_range.get('end'):
                queryset = queryset.filter(date__lte=custom_date_range['end'])
        
        return queryset
    
    def _generate_excel_file(self, data):
        """Generate Excel file with multiple sheets"""
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            for sheet_name, sheet_data in data.items():
                if sheet_data:
                    df = pd.DataFrame(sheet_data)
                    df.to_excel(writer, sheet_name=sheet_name[:31], index=False)
                    
                    # Get the worksheet
                    worksheet = writer.sheets[sheet_name[:31]]
                    
                    # Style the header row
                    header_font = Font(bold=True, color="FFFFFF")
                    header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
                    header_alignment = Alignment(horizontal="center", vertical="center")
                    
                    for cell in worksheet[1]:
                        cell.font = header_font
                        cell.fill = header_fill
                        cell.alignment = header_alignment
                    
                    # Auto-adjust column widths
                    for column in worksheet.columns:
                        max_length = 0
                        column_letter = column[0].column_letter
                        
                        for cell in column:
                            try:
                                if len(str(cell.value)) > max_length:
                                    max_length = len(str(cell.value))
                            except:
                                pass
                        
                        adjusted_width = min(max_length + 2, 50)
                        worksheet.column_dimensions[column_letter].width = adjusted_width
        
        output.seek(0)
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        return response
    
    def _generate_csv_file(self, data, name):
        """Generate CSV file"""
        output = io.StringIO()
        
        if data:
            df = pd.DataFrame(data)
            df.to_csv(output, index=False)
        
        output.seek(0)
        response = HttpResponse(output.getvalue(), content_type='text/csv')
        return response