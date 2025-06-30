from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, black, red, gray
from reportlab.pdfbase import pdfform
from reportlab.pdfbase.pdfform import textFieldRelative
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.graphics.barcode import qr, code128
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
import io
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
import tempfile


class TaxFormGenerator:
    """Base PDF form generator for tax forms using ReportLab"""
    
    def __init__(self, form_type: str, filing_period: str, is_draft: bool = True):
        self.form_type = form_type
        self.filing_period = filing_period
        self.is_draft = is_draft
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
    def _setup_custom_styles(self):
        """Setup custom paragraph styles for forms"""
        self.styles.add(ParagraphStyle(
            name='FormTitle',
            parent=self.styles['Heading1'],
            fontSize=16,
            alignment=TA_CENTER,
            spaceAfter=12
        ))
        
        self.styles.add(ParagraphStyle(
            name='FieldLabel',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=black
        ))
        
        self.styles.add(ParagraphStyle(
            name='Instructions',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=gray,
            italic=True
        ))
        
        self.styles.add(ParagraphStyle(
            name='Warning',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=red,
            bold=True
        ))
    
    def generate_form(self, data: Dict[str, Any], output_path: Optional[str] = None) -> bytes:
        """Generate PDF form with given data"""
        if output_path:
            buffer = output_path
        else:
            buffer = io.BytesIO()
            
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.75*inch,
            bottomMargin=0.5*inch
        )
        
        story = []
        
        # Add watermark for draft versions
        if self.is_draft:
            story.extend(self._create_draft_watermark())
        
        # Add form header
        story.extend(self._create_form_header(data))
        
        # Add form body based on type
        if self.form_type == "941":
            story.extend(self._create_941_form(data))
        elif self.form_type == "940":
            story.extend(self._create_940_form(data))
        elif self.form_type.startswith("STATE_SALES_"):
            story.extend(self._create_state_sales_form(data))
        else:
            story.extend(self._create_generic_form(data))
        
        # Add barcode/QR code
        story.append(Spacer(1, 0.5*inch))
        story.append(self._create_tracking_code(data))
        
        # Build PDF
        doc.build(story, onFirstPage=self._add_page_elements, onLaterPages=self._add_page_elements)
        
        if not output_path:
            pdf_bytes = buffer.getvalue()
            buffer.close()
            return pdf_bytes
    
    def _add_page_elements(self, canvas_obj, doc):
        """Add page numbers and other elements to each page"""
        canvas_obj.saveState()
        
        # Add draft watermark
        if self.is_draft:
            canvas_obj.setFont("Helvetica", 50)
            canvas_obj.setFillColor(HexColor("#CCCCCC"))
            canvas_obj.setFillAlpha(0.3)
            canvas_obj.translate(4*inch, 5.5*inch)
            canvas_obj.rotate(45)
            canvas_obj.drawCentredString(0, 0, "DRAFT")
            canvas_obj.rotate(-45)
            canvas_obj.translate(-4*inch, -5.5*inch)
            canvas_obj.setFillAlpha(1)
        
        # Add page number
        canvas_obj.setFont("Helvetica", 9)
        canvas_obj.setFillColor(black)
        page_num = canvas_obj.getPageNumber()
        text = f"Page {page_num}"
        canvas_obj.drawRightString(7.5*inch, 0.4*inch, text)
        
        # Add form identifier
        canvas_obj.setFont("Helvetica", 8)
        form_id = f"Form {self.form_type} - {self.filing_period}"
        canvas_obj.drawString(0.5*inch, 0.4*inch, form_id)
        
        canvas_obj.restoreState()
    
    def _create_draft_watermark(self) -> List:
        """Create draft watermark elements"""
        return []  # Watermark is added in _add_page_elements
    
    def _create_form_header(self, data: Dict[str, Any]) -> List:
        """Create form header with title and basic info"""
        elements = []
        
        # Form title
        title = Paragraph(f"Form {self.form_type} - {self.get_form_title()}", self.styles['FormTitle'])
        elements.append(title)
        elements.append(Spacer(1, 0.2*inch))
        
        # Filing period
        period_text = f"Filing Period: {self.filing_period}"
        elements.append(Paragraph(period_text, self.styles['Normal']))
        elements.append(Spacer(1, 0.1*inch))
        
        # Business info table
        business_data = [
            ["Business Name:", data.get('business_name', '')],
            ["EIN:", data.get('ein', '')],
            ["Address:", data.get('address', '')],
            ["City, State, ZIP:", f"{data.get('city', '')}, {data.get('state', '')} {data.get('zip', '')}"]
        ]
        
        business_table = Table(business_data, colWidths=[1.5*inch, 5*inch])
        business_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        
        elements.append(business_table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_941_form(self, data: Dict[str, Any]) -> List:
        """Create Form 941 - Employer's Quarterly Federal Tax Return"""
        elements = []
        
        # Part 1: Answer these questions for this quarter
        elements.append(Paragraph("<b>Part 1: Answer these questions for this quarter</b>", self.styles['Heading2']))
        elements.append(Spacer(1, 0.1*inch))
        
        part1_data = [
            ["1.", "Number of employees who received wages, tips, or other compensation:", 
             data.get('num_employees', '0')],
            ["2.", "Wages, tips, and other compensation:", 
             f"${data.get('total_wages', '0.00'):,.2f}"],
            ["3.", "Federal income tax withheld from wages, tips, and other compensation:", 
             f"${data.get('federal_tax_withheld', '0.00'):,.2f}"],
            ["4.", "If no wages, tips, and other compensation are subject to social security or Medicare tax:", 
             "Check and go to line 6" if data.get('no_wages_subject', False) else ""],
        ]
        
        part1_table = Table(part1_data, colWidths=[0.3*inch, 4.5*inch, 1.5*inch])
        part1_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('LINEBELOW', (2, 0), (2, -1), 0.5, black),
        ]))
        
        elements.append(part1_table)
        elements.append(Spacer(1, 0.2*inch))
        
        # Part 2: Deposit schedule
        elements.append(Paragraph("<b>Part 2: Tell us about your deposit schedule and tax liability</b>", 
                                self.styles['Heading2']))
        elements.append(Spacer(1, 0.1*inch))
        
        deposit_schedule = data.get('deposit_schedule', 'monthly')
        elements.append(Paragraph(f"Deposit Schedule: {deposit_schedule.title()}", self.styles['Normal']))
        
        if deposit_schedule == 'monthly':
            monthly_data = [
                ["Month 1:", f"${data.get('month1_liability', '0.00'):,.2f}"],
                ["Month 2:", f"${data.get('month2_liability', '0.00'):,.2f}"],
                ["Month 3:", f"${data.get('month3_liability', '0.00'):,.2f}"],
                ["Total liability for quarter:", f"${data.get('total_liability', '0.00'):,.2f}"],
            ]
            
            monthly_table = Table(monthly_data, colWidths=[2*inch, 2*inch])
            monthly_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('LINEBELOW', (1, 0), (1, -2), 0.5, black),
                ('LINEBELOW', (1, -1), (1, -1), 1, black),
                ('FONT', (0, -1), (-1, -1), 'Helvetica-Bold', 10),
            ]))
            
            elements.append(monthly_table)
        
        elements.append(Spacer(1, 0.3*inch))
        
        # Signature section
        elements.append(self._create_signature_section())
        
        return elements
    
    def _create_940_form(self, data: Dict[str, Any]) -> List:
        """Create Form 940 - Employer's Annual Federal Unemployment (FUTA) Tax Return"""
        elements = []
        
        elements.append(Paragraph("<b>Part 1: Tell us about your return</b>", self.styles['Heading2']))
        elements.append(Spacer(1, 0.1*inch))
        
        part1_data = [
            ["1a.", "If you had to pay state unemployment tax in one state only:", 
             data.get('single_state', '')],
            ["1b.", "If you had to pay state unemployment tax in more than one state:", 
             "Check here" if data.get('multi_state', False) else ""],
            ["2.", "If you paid wages in a state that is subject to CREDIT REDUCTION:", 
             "Check here" if data.get('credit_reduction', False) else ""],
        ]
        
        part1_table = Table(part1_data, colWidths=[0.3*inch, 4.5*inch, 1.5*inch])
        part1_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        elements.append(part1_table)
        elements.append(Spacer(1, 0.2*inch))
        
        # Part 2: Determine your FUTA tax
        elements.append(Paragraph("<b>Part 2: Determine your FUTA tax before adjustments</b>", 
                                self.styles['Heading2']))
        elements.append(Spacer(1, 0.1*inch))
        
        part2_data = [
            ["3.", "Total payments to all employees:", 
             f"${data.get('total_payments', '0.00'):,.2f}"],
            ["4.", "Payments exempt from FUTA tax:", 
             f"${data.get('exempt_payments', '0.00'):,.2f}"],
            ["5.", "Total of payments made to each employee in excess of $7,000:", 
             f"${data.get('excess_payments', '0.00'):,.2f}"],
            ["6.", "Subtotal (line 4 + line 5):", 
             f"${data.get('subtotal_exempt', '0.00'):,.2f}"],
            ["7.", "Total taxable FUTA wages (line 3 - line 6):", 
             f"${data.get('taxable_wages', '0.00'):,.2f}"],
            ["8.", "FUTA tax before adjustments (line 7 × 0.006):", 
             f"${data.get('futa_tax', '0.00'):,.2f}"],
        ]
        
        part2_table = Table(part2_data, colWidths=[0.3*inch, 4*inch, 2*inch])
        part2_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('LINEBELOW', (2, 0), (2, -1), 0.5, black),
        ]))
        
        elements.append(part2_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Signature section
        elements.append(self._create_signature_section())
        
        return elements
    
    def _create_state_sales_form(self, data: Dict[str, Any]) -> List:
        """Create state sales tax return form"""
        elements = []
        state_code = self.form_type.replace("STATE_SALES_", "")
        
        elements.append(Paragraph(f"<b>{state_code} Sales and Use Tax Return</b>", self.styles['Heading2']))
        elements.append(Spacer(1, 0.1*inch))
        
        # Sales data
        sales_data = [
            ["Gross Sales:", f"${data.get('gross_sales', '0.00'):,.2f}"],
            ["Exempt Sales:", f"${data.get('exempt_sales', '0.00'):,.2f}"],
            ["Taxable Sales:", f"${data.get('taxable_sales', '0.00'):,.2f}"],
            ["Tax Rate:", f"{data.get('tax_rate', '0.00')}%"],
            ["Sales Tax Due:", f"${data.get('sales_tax_due', '0.00'):,.2f}"],
            ["", ""],
            ["Use Tax Purchases:", f"${data.get('use_tax_purchases', '0.00'):,.2f}"],
            ["Use Tax Due:", f"${data.get('use_tax_due', '0.00'):,.2f}"],
            ["", ""],
            ["Total Tax Due:", f"${data.get('total_tax_due', '0.00'):,.2f}"],
            ["Less: Credits/Prepayments:", f"${data.get('credits', '0.00'):,.2f}"],
            ["Net Tax Due:", f"${data.get('net_tax_due', '0.00'):,.2f}"],
        ]
        
        sales_table = Table(sales_data, colWidths=[3*inch, 2*inch])
        sales_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('LINEBELOW', (1, 0), (1, 4), 0.5, black),
            ('LINEBELOW', (1, 6), (1, 7), 0.5, black),
            ('LINEBELOW', (1, 9), (1, 11), 0.5, black),
            ('LINEBELOW', (1, -1), (1, -1), 2, black),
            ('FONT', (0, 9), (0, 9), 'Helvetica-Bold', 10),
            ('FONT', (0, -1), (0, -1), 'Helvetica-Bold', 10),
        ]))
        
        elements.append(sales_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Location breakdown if applicable
        if data.get('location_breakdown'):
            elements.append(Paragraph("<b>Sales by Location</b>", self.styles['Heading3']))
            elements.append(Spacer(1, 0.1*inch))
            
            location_data = [["Location", "Taxable Sales", "Tax Rate", "Tax Due"]]
            for location in data['location_breakdown']:
                location_data.append([
                    location['name'],
                    f"${location['taxable_sales']:,.2f}",
                    f"{location['tax_rate']}%",
                    f"${location['tax_due']:,.2f}"
                ])
            
            location_table = Table(location_data, colWidths=[2.5*inch, 1.5*inch, 1*inch, 1.5*inch])
            location_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, -1), 'Helvetica', 9),
                ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 9),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('LINEBELOW', (0, 0), (-1, 0), 1, black),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor("#F5F5F5"), HexColor("#FFFFFF")]),
            ]))
            
            elements.append(location_table)
            elements.append(Spacer(1, 0.3*inch))
        
        # Signature section
        elements.append(self._create_signature_section())
        
        return elements
    
    def _create_generic_form(self, data: Dict[str, Any]) -> List:
        """Create a generic tax form layout"""
        elements = []
        
        elements.append(Paragraph("<b>Tax Information</b>", self.styles['Heading2']))
        elements.append(Spacer(1, 0.1*inch))
        
        # Create table from data
        table_data = []
        for key, value in data.items():
            if key not in ['business_name', 'ein', 'address', 'city', 'state', 'zip', 
                          'tracking_number', 'form_id']:
                label = key.replace('_', ' ').title() + ":"
                if isinstance(value, (int, float)):
                    value_str = f"${value:,.2f}" if 'amount' in key or 'tax' in key else str(value)
                else:
                    value_str = str(value)
                table_data.append([label, value_str])
        
        if table_data:
            data_table = Table(table_data, colWidths=[3*inch, 3*inch])
            data_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('LINEBELOW', (1, 0), (1, -1), 0.5, gray),
            ]))
            
            elements.append(data_table)
            elements.append(Spacer(1, 0.3*inch))
        
        # Signature section
        elements.append(self._create_signature_section())
        
        return elements
    
    def _create_signature_section(self) -> List:
        """Create signature section for forms"""
        elements = []
        
        elements.append(Paragraph("<b>Sign Here</b>", self.styles['Heading3']))
        elements.append(Spacer(1, 0.1*inch))
        
        elements.append(Paragraph(
            "Under penalties of perjury, I declare that I have examined this return, "
            "including accompanying schedules and statements, and to the best of my knowledge "
            "and belief, it is true, correct, and complete.",
            self.styles['Instructions']
        ))
        elements.append(Spacer(1, 0.2*inch))
        
        # Signature fields
        sig_data = [
            ["Signature:", "_" * 50, "Date:", "_" * 20],
            ["", "", "", ""],
            ["Print Name:", "_" * 50, "Title:", "_" * 20],
            ["", "", "", ""],
            ["Phone:", "_" * 30, "Email:", "_" * 30],
        ]
        
        sig_table = Table(sig_data, colWidths=[1*inch, 2.5*inch, 0.5*inch, 2*inch])
        sig_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 10),
            ('FONT', (2, 0), (2, -1), 'Helvetica-Bold', 10),
            ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ]))
        
        elements.append(sig_table)
        
        # Digital signature placeholder
        elements.append(Spacer(1, 0.2*inch))
        elements.append(Paragraph(
            "Digital Signature: [Digital signature will be applied upon electronic submission]",
            self.styles['Instructions']
        ))
        
        return elements
    
    def _create_tracking_code(self, data: Dict[str, Any]) -> Drawing:
        """Create QR code for tracking"""
        tracking_data = {
            'form': self.form_type,
            'period': self.filing_period,
            'ein': data.get('ein', ''),
            'tracking': data.get('tracking_number', self._generate_tracking_number()),
            'timestamp': datetime.now().isoformat()
        }
        
        # Create QR code string
        qr_string = "|".join([f"{k}:{v}" for k, v in tracking_data.items()])
        
        # Create QR code
        qr_code = qr.QrCodeWidget(qr_string)
        bounds = qr_code.getBounds()
        width = bounds[2] - bounds[0]
        height = bounds[3] - bounds[1]
        
        # Scale to 1.5 inches
        scale = 1.5 * inch / max(width, height)
        qr_code.scale = scale
        
        # Create drawing
        d = Drawing(1.5*inch, 1.5*inch)
        d.add(qr_code)
        
        # Add tracking number below
        from reportlab.graphics.shapes import String
        tracking_text = String(
            0.75*inch, -0.2*inch, 
            f"Tracking: {tracking_data['tracking']}", 
            textAnchor='middle',
            fontSize=8
        )
        d.add(tracking_text)
        
        return d
    
    def _generate_tracking_number(self) -> str:
        """Generate unique tracking number"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        return f"{self.form_type}-{timestamp}"
    
    def get_form_title(self) -> str:
        """Get human-readable form title"""
        form_titles = {
            "941": "Employer's Quarterly Federal Tax Return",
            "940": "Employer's Annual Federal Unemployment (FUTA) Tax Return",
            "W2": "Wage and Tax Statement",
            "1099": "Miscellaneous Income",
        }
        
        if self.form_type.startswith("STATE_SALES_"):
            state = self.form_type.replace("STATE_SALES_", "")
            return f"{state} Sales and Use Tax Return"
        
        return form_titles.get(self.form_type, "Tax Form")
    
    def create_fillable_fields(self, canvas_obj, fields: List[Dict[str, Any]]):
        """Add fillable form fields to PDF"""
        for field in fields:
            if field['type'] == 'text':
                textFieldRelative(
                    canvas_obj,
                    field['name'],
                    field['x'], field['y'],
                    field.get('width', 200),
                    field.get('height', 20),
                    value=field.get('value', ''),
                    maxlen=field.get('maxlen', 100)
                )
            elif field['type'] == 'checkbox':
                # Draw a simple checkbox since checkboxRelative is not available
                size = field.get('size', 12)
                canvas_obj.rect(field['x'], field['y'], size, size)
                if field.get('checked', False):
                    canvas_obj.line(field['x'], field['y'], field['x'] + size, field['y'] + size)
                    canvas_obj.line(field['x'] + size, field['y'], field['x'], field['y'] + size)
    
    def add_attachments(self, main_pdf: bytes, attachments: List[bytes]) -> bytes:
        """Combine main form with attachment PDFs"""
        from PyPDF2 import PdfMerger
        
        merger = PdfMerger()
        
        # Add main form
        merger.append(io.BytesIO(main_pdf))
        
        # Add attachments
        for attachment in attachments:
            merger.append(io.BytesIO(attachment))
        
        # Write merged PDF
        output = io.BytesIO()
        merger.write(output)
        merger.close()
        
        output.seek(0)
        return output.read()
    
    def generate_filing_confirmation(self, filing_data: Dict[str, Any]) -> bytes:
        """Generate filing confirmation page"""
        buffer = io.BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.75*inch,
            bottomMargin=0.5*inch
        )
        
        story = []
        
        # Header
        story.append(Paragraph("Tax Filing Confirmation", self.styles['FormTitle']))
        story.append(Spacer(1, 0.3*inch))
        
        # Confirmation details
        confirm_data = [
            ["Filing Date:", datetime.now().strftime("%B %d, %Y")],
            ["Form Type:", f"{self.form_type} - {self.get_form_title()}"],
            ["Filing Period:", self.filing_period],
            ["Tracking Number:", filing_data.get('tracking_number', self._generate_tracking_number())],
            ["Status:", "Successfully Submitted"],
            ["", ""],
            ["Business Name:", filing_data.get('business_name', '')],
            ["EIN:", filing_data.get('ein', '')],
            ["", ""],
            ["Amount Due:", f"${filing_data.get('amount_due', 0):,.2f}"],
            ["Payment Status:", filing_data.get('payment_status', 'Pending')],
        ]
        
        confirm_table = Table(confirm_data, colWidths=[2*inch, 4*inch])
        confirm_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 11),
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 11),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LINEBELOW', (1, 3), (1, 3), 1, black),
            ('LINEBELOW', (1, 9), (1, 9), 1, black),
        ]))
        
        story.append(confirm_table)
        story.append(Spacer(1, 0.5*inch))
        
        # Important notes
        story.append(Paragraph("<b>Important Information:</b>", self.styles['Heading3']))
        story.append(Spacer(1, 0.1*inch))
        
        notes = [
            "• Keep this confirmation for your records",
            "• Your filing has been electronically submitted to the tax authority",
            "• You will receive an acknowledgment from the tax authority within 24-48 hours",
            "• If payment is due, ensure payment is made by the due date to avoid penalties",
            "• For questions about this filing, reference the tracking number above"
        ]
        
        for note in notes:
            story.append(Paragraph(note, self.styles['Normal']))
            story.append(Spacer(1, 0.05*inch))
        
        story.append(Spacer(1, 0.3*inch))
        
        # QR code for confirmation
        story.append(self._create_tracking_code(filing_data))
        
        # Build PDF
        doc.build(story)
        
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes