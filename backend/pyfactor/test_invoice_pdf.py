#!/usr/bin/env python
"""
Test script for invoice PDF generation endpoint.
Run this from the Django shell or as a management command.
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from sales.models import Invoice
from sales.utils import generate_invoice_pdf


def test_invoice_pdf():
    """Test the invoice PDF generation."""
    # Get the first invoice (you might want to use a specific ID)
    try:
        invoice = Invoice.objects.select_related('customer').prefetch_related('items').first()
        
        if not invoice:
            print("No invoices found in the database.")
            return
            
        print(f"Testing PDF generation for invoice: {invoice.invoice_num}")
        print(f"Customer: {invoice.customer.customerName if hasattr(invoice.customer, 'customerName') else 'Unknown'}")
        print(f"Total Amount: ${invoice.totalAmount}")
        print(f"Status: {invoice.status}")
        
        # Generate PDF
        pdf_buffer = generate_invoice_pdf(invoice)
        
        # Save to file for testing
        with open(f'test_invoice_{invoice.invoice_num}.pdf', 'wb') as f:
            f.write(pdf_buffer.getvalue())
            
        print(f"PDF generated successfully! Saved as test_invoice_{invoice.invoice_num}.pdf")
        print(f"The API endpoint would be: /api/sales/invoices/{invoice.id}/pdf/")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_invoice_pdf()