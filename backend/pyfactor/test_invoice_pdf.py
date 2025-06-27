#!/usr/bin/env python
"""
Test script to verify invoice PDF generation
Run this from Django shell: python manage.py shell < test_invoice_pdf.py
"""

from sales.models import Invoice
from sales.utils import generate_invoice_pdf
from pyfactor.logging_config import get_logger

logger = get_logger()

try:
    # Get the first invoice
    invoice = Invoice.objects.first()
    
    if invoice:
        logger.info(f"Testing PDF generation for invoice: {invoice.invoice_num}")
        logger.info(f"Invoice ID: {invoice.id}")
        logger.info(f"Customer: {invoice.customer if hasattr(invoice, 'customer') else 'No customer'}")
        logger.info(f"Total Amount: {invoice.totalAmount}")
        logger.info(f"Date: {invoice.date}")
        logger.info(f"Status: {invoice.status}")
        
        # Try to generate PDF
        pdf_buffer = generate_invoice_pdf(invoice)
        logger.info("PDF generation successful!")
        logger.info(f"PDF size: {len(pdf_buffer.getvalue())} bytes")
    else:
        logger.error("No invoices found in the database")
        
except Exception as e:
    logger.error(f"Error during PDF test: {str(e)}")
    import traceback
    logger.error(traceback.format_exc())