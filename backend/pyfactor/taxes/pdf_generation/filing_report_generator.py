"""
Tax Filing Report Generator
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, black, red, gray
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
from decimal import Decimal

from .form_generator import TaxFormGenerator


class FilingReportGenerator(TaxFormGenerator):
    """Generate PDF tax filing reports for the filing service"""
    
    def __init__(self, filing, is_draft=False):
        """
        Initialize the filing report generator
        
        Args:
            filing: TaxFiling instance
            is_draft: Whether this is a draft report
        """
        super().__init__(
            form_type=f"{filing.country} Tax Filing Report",
            filing_period=filing.filing_period,
            is_draft=is_draft
        )
        self.filing = filing
        
    def generate_report(self) -> bytes:
        """Generate the complete filing report PDF"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch,
            leftMargin=0.75*inch,
            rightMargin=0.75*inch
        )
        
        story = []
        
        # Add header
        story.extend(self._create_header())
        
        # Add filing information
        story.extend(self._create_filing_info())
        
        # Add sales summary
        story.extend(self._create_sales_summary())
        
        # Add tax calculations
        story.extend(self._create_tax_calculations())
        
        # Add filing instructions
        story.extend(self._create_filing_instructions())
        
        # Add payment details
        if self.filing.payment_status == 'paid':
            story.extend(self._create_payment_confirmation())
        
        # Add footer with disclaimer
        story.extend(self._create_footer())
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.read()
    
    def _create_header(self) -> List:
        """Create the report header"""
        elements = []
        
        # Title
        title = Paragraph(
            f"<b>Tax Filing Report - {self.filing.country}</b>",
            self.styles['FormTitle']
        )
        elements.append(title)
        
        # Subtitle
        subtitle = Paragraph(
            f"Filing Period: {self.filing.filing_period} | Type: {self.filing.filing_type_service.title()} Filing",
            self.styles['Normal']
        )
        elements.append(subtitle)
        elements.append(Spacer(1, 0.3*inch))
        
        # Draft watermark if applicable
        if self.is_draft:
            draft_style = ParagraphStyle(
                name='Draft',
                parent=self.styles['Normal'],
                fontSize=48,
                textColor=HexColor('#CCCCCC'),
                alignment=TA_CENTER
            )
            draft = Paragraph("<b>DRAFT</b>", draft_style)
            elements.append(draft)
            elements.append(Spacer(1, 0.2*inch))
        
        return elements
    
    def _create_filing_info(self) -> List:
        """Create filing information section"""
        elements = []
        
        # Section header
        header = Paragraph("<b>Filing Information</b>", self.styles['Heading2'])
        elements.append(header)
        elements.append(Spacer(1, 0.1*inch))
        
        # Filing details table
        data = [
            ["Filing ID:", str(self.filing.filing_id)],
            ["Country:", self.filing.country],
            ["Region/State:", self.filing.region_code or "N/A"],
            ["Period Type:", self.filing.period_type.title()],
            ["Filing Year:", str(self.filing.filing_year)],
            ["Due Date:", self.filing.due_date.strftime("%B %d, %Y") if self.filing.due_date else "N/A"],
            ["Status:", self.filing.status.replace('_', ' ').title()],
        ]
        
        table = Table(data, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_sales_summary(self) -> List:
        """Create sales summary section"""
        elements = []
        
        # Section header
        header = Paragraph("<b>Sales Summary</b>", self.styles['Heading2'])
        elements.append(header)
        elements.append(Spacer(1, 0.1*inch))
        
        # Sales data table
        data = [
            ["", "Amount"],
            ["Total Sales:", f"${self.filing.total_sales:,.2f}"],
            ["Non-Taxable Sales:", f"${self.filing.total_sales - self.filing.taxable_sales:,.2f}"],
            ["Taxable Sales:", f"${self.filing.taxable_sales:,.2f}"],
        ]
        
        table = Table(data, colWidths=[3*inch, 2*inch])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('LINEBELOW', (0, 0), (-1, 0), 1, black),
            ('LINEABOVE', (0, -1), (-1, -1), 1, black),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_tax_calculations(self) -> List:
        """Create tax calculations section"""
        elements = []
        
        # Section header
        header = Paragraph("<b>Tax Calculations</b>", self.styles['Heading2'])
        elements.append(header)
        elements.append(Spacer(1, 0.1*inch))
        
        # Tax calculations table
        tax_rate_percent = float(self.filing.tax_rate) * 100
        data = [
            ["Description", "Calculation", "Amount"],
            ["Taxable Sales", "", f"${self.filing.taxable_sales:,.2f}"],
            ["Tax Rate", f"{tax_rate_percent:.2f}%", ""],
            ["Tax Collected", f"${self.filing.taxable_sales:,.2f} × {tax_rate_percent:.2f}%", f"${self.filing.tax_collected:,.2f}"],
        ]
        
        # Add any adjustments or credits here if applicable
        
        data.append(["Total Tax Due", "", f"${self.filing.tax_collected:,.2f}"])
        
        table = Table(data, colWidths=[2.5*inch, 2*inch, 1.5*inch])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, -1), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('LINEBELOW', (0, 0), (-1, 0), 1, black),
            ('LINEABOVE', (0, -1), (-1, -1), 2, black),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, -1), (-1, -1), HexColor('#F0F0F0')),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_filing_instructions(self) -> List:
        """Create filing instructions section"""
        elements = []
        
        # Section header
        header = Paragraph("<b>Filing Instructions</b>", self.styles['Heading2'])
        elements.append(header)
        elements.append(Spacer(1, 0.1*inch))
        
        # Get filing info from GlobalSalesTaxRate if available
        from taxes.models import GlobalSalesTaxRate
        tax_info = GlobalSalesTaxRate.objects.filter(
            country=self.filing.country,
            region_code=self.filing.region_code if self.filing.region_code else None,
            is_current=True
        ).first()
        
        if self.filing.filing_type_service == 'manual':
            # Manual filing instructions
            instructions = [
                "<b>Manual Filing Instructions:</b>",
                "",
                "1. Review all information in this report for accuracy.",
                "2. Print this report for your records.",
            ]
            
            if tax_info and tax_info.main_form_name:
                instructions.append(f"3. Complete official form: {tax_info.main_form_name}")
            else:
                instructions.append("3. Complete the official tax form for your jurisdiction.")
            
            if tax_info and tax_info.tax_authority_name:
                instructions.append(f"4. Submit the form to: {tax_info.tax_authority_name}")
            else:
                instructions.append("4. Submit the form to your local tax authority.")
            
            instructions.extend([
                "5. Make payment for the tax amount due.",
                "6. Keep all receipts and confirmation numbers for your records.",
                "",
                "<b>Important:</b> This report is for your reference only. You must file the official forms with the tax authority."
            ])
            
        else:  # online filing
            instructions = [
                "<b>Online Filing Status:</b>",
                "",
                "We will file your tax return electronically on your behalf.",
                "",
                "<b>What happens next:</b>",
                "1. We will submit your return within 1-2 business days.",
                "2. You will receive an email confirmation once filed.",
                "3. The tax authority confirmation number will be provided.",
                "4. Any tax due will be remitted as per your instructions.",
                "",
                "<b>Important:</b> Keep this report and all confirmations for your records."
            ]
        
        for instruction in instructions:
            if instruction:
                style = self.styles['Normal'] if not instruction.startswith("<b>") else self.styles['Heading3']
                para = Paragraph(instruction, style)
                elements.append(para)
                if instruction == "":
                    elements.append(Spacer(1, 0.1*inch))
        
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_payment_confirmation(self) -> List:
        """Create payment confirmation section"""
        elements = []
        
        # Section header
        header = Paragraph("<b>Payment Confirmation</b>", self.styles['Heading2'])
        elements.append(header)
        elements.append(Spacer(1, 0.1*inch))
        
        # Payment details
        payment_data = [
            ["Service Fee:", f"${self.filing.filing_fee:,.2f}"],
            ["Payment Status:", "PAID"],
            ["Payment Date:", self.filing.payment_date.strftime("%B %d, %Y") if self.filing.payment_date else "N/A"],
            ["Transaction ID:", self.filing.stripe_payment_intent_id or "N/A"],
        ]
        
        table = Table(payment_data, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (1, 1), (1, 1), HexColor('#00AA00')),
            ('FONTNAME', (1, 1), (1, 1), 'Helvetica-Bold'),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _create_footer(self) -> List:
        """Create footer with disclaimer"""
        elements = []
        
        elements.append(Spacer(1, 0.5*inch))
        
        # Disclaimer
        disclaimer_style = ParagraphStyle(
            name='Disclaimer',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=gray
        )
        
        disclaimer_text = (
            "<b>Disclaimer:</b> This report is prepared based on the information provided. "
            "It is the taxpayer's responsibility to ensure all information is accurate and complete. "
            "Tax laws and regulations may change. Always consult with a qualified tax professional "
            "for specific advice regarding your tax situation. This service does not constitute "
            "legal or tax advice."
        )
        
        disclaimer = Paragraph(disclaimer_text, disclaimer_style)
        elements.append(disclaimer)
        
        # Generated date
        elements.append(Spacer(1, 0.2*inch))
        generated = Paragraph(
            f"Report generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
            disclaimer_style
        )
        elements.append(generated)
        
        return elements


def generate_filing_report(filing_id: str) -> bytes:
    """
    Generate a PDF report for a tax filing
    
    Args:
        filing_id: UUID of the TaxFiling
        
    Returns:
        bytes: PDF content
    """
    from taxes.models import TaxFiling
    
    try:
        filing = TaxFiling.objects.get(filing_id=filing_id)
        generator = FilingReportGenerator(filing, is_draft=(filing.payment_status != 'paid'))
        return generator.generate_report()
    except TaxFiling.DoesNotExist:
        raise ValueError(f"Filing {filing_id} not found")
    except Exception as e:
        raise Exception(f"Error generating report: {str(e)}")