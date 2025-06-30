import os
import io
import hashlib
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, red, blue
from reportlab.lib.units import inch
from reportlab.graphics.barcode import qr, code128
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from reportlab.pdfbase.pdfform import textFieldRelative, checkboxRelative
import tempfile


class PDFSecurityManager:
    """Handles PDF security features like encryption and digital signatures"""
    
    @staticmethod
    def add_password_protection(pdf_bytes: bytes, user_password: str = None, owner_password: str = None) -> bytes:
        """Add password protection to PDF"""
        try:
            from PyPDF2 import PdfReader, PdfWriter
            
            reader = PdfReader(io.BytesIO(pdf_bytes))
            writer = PdfWriter()
            
            # Copy all pages
            for page in reader.pages:
                writer.add_page(page)
            
            # Add password protection
            if user_password or owner_password:
                writer.encrypt(
                    user_password=user_password or "",
                    owner_password=owner_password or user_password or "",
                    use_128bit=True
                )
            
            # Write to bytes
            output = io.BytesIO()
            writer.write(output)
            output.seek(0)
            
            return output.read()
            
        except ImportError:
            # PyPDF2 not available, return original
            return pdf_bytes
        except Exception:
            # Error in encryption, return original
            return pdf_bytes
    
    @staticmethod
    def add_digital_signature_placeholder(canvas_obj, x: float, y: float, width: float = 3*inch, height: float = 1*inch):
        """Add digital signature placeholder field"""
        canvas_obj.saveState()
        
        # Draw signature box
        canvas_obj.setStrokeColor(black)
        canvas_obj.setLineWidth(1)
        canvas_obj.rect(x, y, width, height)
        
        # Add signature field
        textFieldRelative(
            canvas_obj,
            "digital_signature",
            x, y,
            width, height,
            value="[Digital signature will be applied]",
            maxlen=200
        )
        
        # Add timestamp field
        canvas_obj.setFont("Helvetica", 8)
        canvas_obj.drawString(x, y - 0.2*inch, f"Signature Date: {datetime.now().strftime('%m/%d/%Y %H:%M:%S')}")
        
        canvas_obj.restoreState()
    
    @staticmethod
    def calculate_checksum(pdf_bytes: bytes) -> str:
        """Calculate MD5 checksum for PDF integrity"""
        return hashlib.md5(pdf_bytes).hexdigest()


class PDFWatermarkManager:
    """Handles PDF watermarking"""
    
    @staticmethod
    def add_draft_watermark(canvas_obj, page_width: float, page_height: float):
        """Add draft watermark to PDF page"""
        canvas_obj.saveState()
        
        # Semi-transparent red text
        canvas_obj.setFillColor(red)
        canvas_obj.setFillAlpha(0.3)
        canvas_obj.setFont("Helvetica-Bold", 72)
        
        # Center and rotate
        canvas_obj.translate(page_width/2, page_height/2)
        canvas_obj.rotate(45)
        canvas_obj.drawCentredString(0, 0, "DRAFT")
        
        canvas_obj.restoreState()
    
    @staticmethod
    def add_confidential_watermark(canvas_obj, page_width: float, page_height: float):
        """Add confidential watermark to PDF page"""
        canvas_obj.saveState()
        
        # Semi-transparent blue text
        canvas_obj.setFillColor(blue)
        canvas_obj.setFillAlpha(0.2)
        canvas_obj.setFont("Helvetica-Bold", 48)
        
        # Bottom center
        canvas_obj.translate(page_width/2, 1*inch)
        canvas_obj.drawCentredString(0, 0, "CONFIDENTIAL")
        
        canvas_obj.restoreState()
    
    @staticmethod
    def add_copy_watermark(canvas_obj, page_width: float, page_height: float, copy_text: str = "COPY"):
        """Add copy watermark to PDF page"""
        canvas_obj.saveState()
        
        # Semi-transparent text
        canvas_obj.setFillColor(black)
        canvas_obj.setFillAlpha(0.1)
        canvas_obj.setFont("Helvetica-Bold", 36)
        
        # Top right corner
        canvas_obj.translate(page_width - 2*inch, page_height - 1*inch)
        canvas_obj.rotate(-45)
        canvas_obj.drawCentredString(0, 0, copy_text)
        
        canvas_obj.restoreState()


class BarcodeGenerator:
    """Generates various barcodes for tax forms"""
    
    @staticmethod
    def create_qr_code(data: str, size: float = 1.5*inch) -> Drawing:
        """Create QR code for form tracking"""
        qr_code = qr.QrCodeWidget(data)
        bounds = qr_code.getBounds()
        width = bounds[2] - bounds[0]
        height = bounds[3] - bounds[1]
        
        # Scale to requested size
        scale = size / max(width, height)
        qr_code.scale = scale
        
        # Create drawing
        d = Drawing(size, size)
        d.add(qr_code)
        
        return d
    
    @staticmethod
    def create_barcode_128(data: str, width: float = 3*inch, height: float = 0.5*inch) -> Drawing:
        """Create Code 128 barcode"""
        barcode = code128.Code128(data)
        
        # Create drawing
        d = Drawing(width, height)
        
        # Scale barcode to fit
        barcode.width = width
        barcode.height = height
        
        d.add(barcode)
        
        return d
    
    @staticmethod
    def create_tracking_barcode(form_type: str, filing_period: str, ein: str, timestamp: str = None) -> str:
        """Create standardized tracking barcode data"""
        if timestamp is None:
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        
        # Format: FORM|PERIOD|EIN|TIMESTAMP
        return f"{form_type}|{filing_period}|{ein}|{timestamp}"


class FormFieldHelper:
    """Helper functions for form field creation and validation"""
    
    @staticmethod
    def create_text_field(canvas_obj, name: str, x: float, y: float, 
                         width: float = 200, height: float = 20, 
                         value: str = "", max_length: int = 100) -> None:
        """Create a text input field"""
        textFieldRelative(
            canvas_obj,
            name,
            x, y,
            width, height,
            value=value,
            maxlen=max_length
        )
    
    @staticmethod
    def create_currency_field(canvas_obj, name: str, x: float, y: float,
                             width: float = 150, height: float = 20,
                             value: float = 0.0) -> None:
        """Create a currency input field"""
        formatted_value = f"${value:,.2f}" if value else "$0.00"
        textFieldRelative(
            canvas_obj,
            name,
            x, y,
            width, height,
            value=formatted_value,
            maxlen=20
        )
    
    @staticmethod
    def create_checkbox_field(canvas_obj, name: str, x: float, y: float,
                             size: float = 12, checked: bool = False) -> None:
        """Create a checkbox field"""
        checkboxRelative(
            canvas_obj,
            name,
            x, y,
            size=size,
            checked=checked
        )
    
    @staticmethod
    def create_signature_field(canvas_obj, name: str, x: float, y: float,
                              width: float = 3*inch, height: float = 0.75*inch) -> None:
        """Create a signature field with border"""
        # Draw border
        canvas_obj.saveState()
        canvas_obj.setStrokeColor(black)
        canvas_obj.setLineWidth(1)
        canvas_obj.rect(x, y, width, height)
        
        # Add text field
        textFieldRelative(
            canvas_obj,
            name,
            x + 2, y + 2,
            width - 4, height - 4,
            value="",
            maxlen=100
        )
        
        # Add label
        canvas_obj.setFont("Helvetica", 8)
        canvas_obj.drawString(x, y - 15, "Signature")
        
        canvas_obj.restoreState()


class PDFValidator:
    """Validates PDF files and form data"""
    
    @staticmethod
    def validate_pdf_integrity(pdf_bytes: bytes) -> Tuple[bool, List[str]]:
        """Validate PDF file integrity"""
        errors = []
        
        try:
            from PyPDF2 import PdfReader
            
            reader = PdfReader(io.BytesIO(pdf_bytes))
            
            # Check if PDF can be read
            if len(reader.pages) == 0:
                errors.append("PDF contains no pages")
            
            # Try to read each page
            for i, page in enumerate(reader.pages):
                try:
                    page.extract_text()
                except Exception as e:
                    errors.append(f"Error reading page {i+1}: {str(e)}")
            
        except Exception as e:
            errors.append(f"PDF validation error: {str(e)}")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def validate_form_data_types(data: Dict[str, Any], field_mapping: Dict[str, Dict[str, Any]]) -> List[str]:
        """Validate data types match field requirements"""
        errors = []
        
        for field_name, field_config in field_mapping.items():
            if field_name not in data:
                continue
            
            value = data[field_name]
            field_type = field_config.get('type', 'text')
            
            if field_type == 'currency' and value is not None:
                try:
                    float(str(value).replace('$', '').replace(',', ''))
                except ValueError:
                    errors.append(f"Field '{field_name}' must be a valid currency amount")
            
            elif field_type == 'number' and value is not None:
                try:
                    int(value)
                except ValueError:
                    errors.append(f"Field '{field_name}' must be a valid number")
            
            elif field_type == 'checkbox' and value is not None:
                if not isinstance(value, bool):
                    errors.append(f"Field '{field_name}' must be true or false")
            
            elif field_type == 'date' and value is not None:
                try:
                    if isinstance(value, str):
                        datetime.strptime(value, "%Y-%m-%d")
                except ValueError:
                    errors.append(f"Field '{field_name}' must be a valid date (YYYY-MM-DD)")
        
        return errors


class TaxCalculationHelper:
    """Helper functions for tax calculations"""
    
    @staticmethod
    def calculate_social_security_tax(wages: float, rate: float = 0.124) -> float:
        """Calculate Social Security tax (employer + employee portions)"""
        # 6.2% each for employer and employee = 12.4% total
        ss_wage_base = 160200  # 2023 limit
        taxable_wages = min(wages, ss_wage_base)
        return round(taxable_wages * rate, 2)
    
    @staticmethod
    def calculate_medicare_tax(wages: float, rate: float = 0.029) -> float:
        """Calculate Medicare tax (employer + employee portions)"""
        # 1.45% each for employer and employee = 2.9% total
        return round(wages * rate, 2)
    
    @staticmethod
    def calculate_additional_medicare_tax(wages: float, filing_status: str = 'single') -> float:
        """Calculate Additional Medicare Tax (0.9% on wages over threshold)"""
        thresholds = {
            'single': 200000,
            'married_joint': 250000,
            'married_separate': 125000
        }
        
        threshold = thresholds.get(filing_status, 200000)
        if wages > threshold:
            return round((wages - threshold) * 0.009, 2)
        return 0.0
    
    @staticmethod
    def calculate_futa_tax(wages: float, rate: float = 0.006) -> float:
        """Calculate Federal Unemployment Tax (FUTA)"""
        futa_wage_base = 7000  # Per employee
        taxable_wages = min(wages, futa_wage_base)
        return round(taxable_wages * rate, 2)
    
    @staticmethod
    def calculate_quarterly_estimated_tax(annual_income: float, tax_rate: float = 0.22) -> float:
        """Calculate quarterly estimated tax payment"""
        annual_tax = annual_income * tax_rate
        return round(annual_tax / 4, 2)


class PDFMerger:
    """Utility for merging multiple PDFs"""
    
    @staticmethod
    def merge_pdfs(pdf_list: List[bytes]) -> bytes:
        """Merge multiple PDF files into one"""
        try:
            from PyPDF2 import PdfMerger
            
            merger = PdfMerger()
            
            for pdf_bytes in pdf_list:
                merger.append(io.BytesIO(pdf_bytes))
            
            output = io.BytesIO()
            merger.write(output)
            merger.close()
            
            output.seek(0)
            return output.read()
            
        except ImportError:
            # PyPDF2 not available, return first PDF
            return pdf_list[0] if pdf_list else b''
        except Exception:
            # Error in merging, return first PDF
            return pdf_list[0] if pdf_list else b''
    
    @staticmethod
    def split_pdf(pdf_bytes: bytes) -> List[bytes]:
        """Split PDF into individual pages"""
        try:
            from PyPDF2 import PdfReader, PdfWriter
            
            reader = PdfReader(io.BytesIO(pdf_bytes))
            pages = []
            
            for page in reader.pages:
                writer = PdfWriter()
                writer.add_page(page)
                
                output = io.BytesIO()
                writer.write(output)
                output.seek(0)
                pages.append(output.read())
            
            return pages
            
        except ImportError:
            return [pdf_bytes]
        except Exception:
            return [pdf_bytes]


class FormStateManager:
    """Manages form state persistence for draft forms"""
    
    def __init__(self, storage_path: str = None):
        self.storage_path = storage_path or tempfile.gettempdir()
    
    def save_form_state(self, form_id: str, form_data: Dict[str, Any]) -> str:
        """Save form state to temporary storage"""
        import json
        
        filename = f"form_state_{form_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = os.path.join(self.storage_path, filename)
        
        with open(filepath, 'w') as f:
            json.dump(form_data, f, indent=2, default=str)
        
        return filepath
    
    def load_form_state(self, filepath: str) -> Dict[str, Any]:
        """Load form state from storage"""
        import json
        
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except Exception:
            return {}
    
    def cleanup_old_states(self, max_age_hours: int = 24):
        """Clean up old form state files"""
        import glob
        import time
        
        pattern = os.path.join(self.storage_path, "form_state_*.json")
        current_time = time.time()
        
        for filepath in glob.glob(pattern):
            file_age = current_time - os.path.getctime(filepath)
            if file_age > (max_age_hours * 3600):
                try:
                    os.remove(filepath)
                except Exception:
                    pass  # Ignore errors