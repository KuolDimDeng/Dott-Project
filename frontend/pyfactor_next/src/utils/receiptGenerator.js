'use client';

import jsPDF from 'jspdf';

/**
 * Receipt Generator Utility
 * Generates formatted receipts for POS sales with various output options
 */

export class ReceiptGenerator {
  constructor(businessInfo = {}) {
    // Only include business info fields that actually exist (no defaults)
    this.businessInfo = {
      name: businessInfo.name || businessInfo.business_name || '',  // Remove hardcoded default
      address: businessInfo.address || businessInfo.business_address || null,
      phone: businessInfo.phone || businessInfo.business_phone || null,
      email: businessInfo.email || businessInfo.business_email || null,
      website: businessInfo.website || businessInfo.business_website || null,
      taxId: businessInfo.taxId || businessInfo.tax_id || null,
      ...businessInfo
    };
  }

  /**
   * Generate receipt data structure
   */
  generateReceiptData(saleData, receiptNumber) {
    const timestamp = new Date();
    
    return {
      receipt: {
        number: receiptNumber || saleData.invoice_number || `REC-${Date.now()}`,
        date: timestamp.toLocaleDateString(),
        time: timestamp.toLocaleTimeString(),
        cashier: saleData.cashier || 'POS System',
      },
      business: this.businessInfo,
      customer: saleData.customer || { name: 'Walk-in Customer' },
      items: saleData.items || [],
      totals: {
        subtotal: saleData.subtotal || '0.00',
        discount: saleData.discount_amount || '0.00',
        discountType: saleData.discount_type || 'amount',
        tax: saleData.tax_amount || '0.00',
        taxRate: saleData.tax_rate || 0,
        total: saleData.total_amount || '0.00'
      },
      payment: {
        method: saleData.payment_method || 'cash',
        amount: saleData.total_amount || '0.00',
        amountTendered: saleData.amount_tendered || saleData.total_amount || '0.00',
        changeDue: saleData.change_due || '0.00'
      },
      notes: saleData.notes || '',
      currency: saleData.currency || 'USD',
      currencySymbol: saleData.currencySymbol || '$'
    };
  }

  /**
   * Generate HTML receipt for display/print
   */
  generateHTMLReceipt(receiptData) {
    const { receipt, business, customer, items, totals, payment, notes, currencySymbol = '$' } = receiptData;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt #${receipt.number}</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            max-width: 300px; 
            margin: 0 auto; 
            padding: 10px;
            background: white;
          }
          .header { text-align: center; margin-bottom: 15px; }
          .business-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .business-info { font-size: 12px; line-height: 1.3; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .receipt-info { margin: 10px 0; font-size: 12px; }
          .items { margin: 10px 0; }
          .item { display: flex; justify-content: space-between; margin: 3px 0; font-size: 12px; }
          .item-name { flex: 1; }
          .item-qty { width: 30px; text-align: center; }
          .item-price { width: 60px; text-align: right; }
          .totals { margin: 10px 0; }
          .total-line { display: flex; justify-content: space-between; margin: 2px 0; font-size: 12px; }
          .total-line.final { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 3px; }
          .payment-info { margin: 10px 0; font-size: 12px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${business.name ? `<div class="business-name">${business.name}</div>` : ''}
          <div class="business-info">
            ${business.address ? `${business.address}<br>` : ''}
            ${this.formatContactInfo(business)}
            ${business.website ? `${business.website}<br>` : ''}
            ${business.taxId ? `Tax ID: ${business.taxId}` : ''}
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="receipt-info">
          <div>Receipt #: ${receipt.number}</div>
          <div>Date: ${receipt.date} ${receipt.time}</div>
          <div>Cashier: ${receipt.cashier}</div>
          ${customer.name !== 'Walk-in Customer' ? `<div>Customer: ${customer.name}</div>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="items">
          ${items.map(item => {
            const itemPrice = item.price !== undefined ? item.price : (item.unit_price || 0);
            const backorderNote = item.isBackorder ? ' (BACKORDER)' : 
                                 item.isPartialBackorder ? ` (${item.backorderQuantity} BACKORDER)` : '';
            return `
            <div class="item">
              <div class="item-name">${item.name}${backorderNote}</div>
              <div class="item-qty">${item.quantity}</div>
              <div class="item-price">${currencySymbol}${(itemPrice * item.quantity).toFixed(2)}</div>
            </div>
            <div style="font-size: 10px; color: #666; margin-left: 5px;">
              ${currencySymbol}${itemPrice} each
              ${item.isBackorder ? '<span style="color: red; font-weight: bold;"> - OUT OF STOCK</span>' : ''}
              ${item.isPartialBackorder ? `<span style="color: orange; font-weight: bold;"> - ${item.backorderQuantity} on backorder</span>` : ''}
            </div>
          `}).join('')}
        </div>
        
        <div class="divider"></div>
        
        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>${currencySymbol}${totals.subtotal}</span>
          </div>
          ${parseFloat(totals.discount) > 0 ? `
            <div class="total-line">
              <span>Discount ${totals.discountType === 'percentage' ? '(%)' : '($)'}:</span>
              <span>-${currencySymbol}${totals.discount}</span>
            </div>
          ` : ''}
          ${parseFloat(totals.tax) > 0 ? `
            <div class="total-line">
              <span>Tax (${totals.taxRate}%):</span>
              <span>${currencySymbol}${totals.tax}</span>
            </div>
          ` : ''}
          <div class="total-line final">
            <span>TOTAL:</span>
            <span>${currencySymbol}${totals.total}</span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="payment-info">
          <div>Payment Method: ${this.formatPaymentMethod(payment.method)}</div>
          ${payment.method === 'cash' ? `
            <div>Amount Tendered: ${currencySymbol}${payment.amountTendered}</div>
            ${parseFloat(payment.changeDue) > 0 ? `<div>Change Due: ${currencySymbol}${payment.changeDue}</div>` : ''}
          ` : `
            <div>Amount Paid: ${currencySymbol}${payment.amount}</div>
          `}
        </div>
        
        ${notes ? `
          <div class="divider"></div>
          <div style="font-size: 11px;">
            <strong>Notes:</strong> ${notes}
          </div>
        ` : ''}
        
        <div class="footer">
          <div>Thank you for your business!</div>
          <div>Generated on ${new Date().toLocaleString()}</div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate PDF receipt
   */
  generatePDFReceipt(receiptData) {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] // Thermal printer paper size
    });

    const { receipt, business, customer, items, totals, payment, notes, currencySymbol = '$' } = receiptData;
    
    let y = 10;
    const lineHeight = 4;
    const pageWidth = 80;
    
    // Header - only show business name if it exists
    if (business.name) {
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text(business.name, pageWidth/2, y, { align: 'center' });
      y += lineHeight + 2;
    }
    
    pdf.setFontSize(8);
    pdf.setFont(undefined, 'normal');
    
    // Only add address if it exists
    if (business.address) {
      pdf.text(business.address, pageWidth/2, y, { align: 'center' });
      y += lineHeight;
    }
    
    // Only add contact info if phone or email exists
    const contactParts = [];
    if (business.phone) contactParts.push(business.phone);
    if (business.email) contactParts.push(business.email);
    if (contactParts.length > 0) {
      pdf.text(contactParts.join(' | '), pageWidth/2, y, { align: 'center' });
      y += lineHeight;
    }
    
    // Only add website if it exists
    if (business.website) {
      pdf.text(business.website, pageWidth/2, y, { align: 'center' });
      y += lineHeight;
    }
    
    y += 3;
    
    // Divider
    pdf.line(5, y, pageWidth-5, y);
    y += 3;
    
    // Receipt info
    pdf.text(`Receipt #: ${receipt.number}`, 5, y);
    y += lineHeight;
    pdf.text(`Date: ${receipt.date} ${receipt.time}`, 5, y);
    y += lineHeight;
    pdf.text(`Cashier: ${receipt.cashier}`, 5, y);
    y += lineHeight;
    
    if (customer.name !== 'Walk-in Customer') {
      pdf.text(`Customer: ${customer.name}`, 5, y);
      y += lineHeight;
    }
    y += 3;
    
    // Divider
    pdf.line(5, y, pageWidth-5, y);
    y += 3;
    
    // Items
    items.forEach(item => {
      const itemPrice = item.price !== undefined ? item.price : (item.unit_price || 0);
      pdf.text(item.name, 5, y);
      pdf.text(`${item.quantity}`, pageWidth-25, y);
      pdf.text(`${currencySymbol}${(itemPrice * item.quantity).toFixed(2)}`, pageWidth-5, y, { align: 'right' });
      y += lineHeight;
      pdf.setFontSize(7);
      pdf.text(`${currencySymbol}${itemPrice} each`, 8, y);
      pdf.setFontSize(8);
      y += lineHeight;
    });
    y += 3;
    
    // Divider
    pdf.line(5, y, pageWidth-5, y);
    y += 3;
    
    // Totals
    pdf.text('Subtotal:', 5, y);
    pdf.text(`${currencySymbol}${totals.subtotal}`, pageWidth-5, y, { align: 'right' });
    y += lineHeight;
    
    if (parseFloat(totals.discount) > 0) {
      pdf.text(`Discount:`, 5, y);
      pdf.text(`-${currencySymbol}${totals.discount}`, pageWidth-5, y, { align: 'right' });
      y += lineHeight;
    }
    
    if (parseFloat(totals.tax) > 0) {
      pdf.text(`Tax (${totals.taxRate}%):`, 5, y);
      pdf.text(`${currencySymbol}${totals.tax}`, pageWidth-5, y, { align: 'right' });
      y += lineHeight;
    }
    
    // Total line
    pdf.line(5, y, pageWidth-5, y);
    y += 2;
    pdf.setFont(undefined, 'bold');
    pdf.text('TOTAL:', 5, y);
    pdf.text(`${currencySymbol}${totals.total}`, pageWidth-5, y, { align: 'right' });
    y += lineHeight + 3;
    
    // Payment info
    pdf.setFont(undefined, 'normal');
    pdf.text(`Payment: ${this.formatPaymentMethod(payment.method)}`, 5, y);
    y += lineHeight;
    
    if (payment.method === 'cash') {
      pdf.text(`Amount Tendered: ${currencySymbol}${payment.amountTendered}`, 5, y);
      y += lineHeight;
      if (parseFloat(payment.changeDue) > 0) {
        pdf.text(`Change Due: ${currencySymbol}${payment.changeDue}`, 5, y);
        y += lineHeight;
      }
    } else {
      pdf.text(`Amount Paid: ${currencySymbol}${payment.amount}`, 5, y);
      y += lineHeight;
    }
    y += 3;
    
    // Notes
    if (notes) {
      pdf.line(5, y, pageWidth-5, y);
      y += 3;
      pdf.setFont(undefined, 'bold');
      pdf.text('Notes:', 5, y);
      y += lineHeight;
      pdf.setFont(undefined, 'normal');
      const noteLines = pdf.splitTextToSize(notes, pageWidth-10);
      pdf.text(noteLines, 5, y);
      y += lineHeight * noteLines.length + 3;
    }
    
    // Footer
    pdf.line(5, y, pageWidth-5, y);
    y += 3;
    pdf.setFontSize(7);
    pdf.text('Thank you for your business!', pageWidth/2, y, { align: 'center' });
    y += lineHeight;
    pdf.text(`Generated on ${new Date().toLocaleString()}`, pageWidth/2, y, { align: 'center' });
    
    return pdf;
  }

  /**
   * Format contact information (phone and email) for display
   */
  formatContactInfo(business) {
    const contactParts = [];
    if (business.phone) contactParts.push(business.phone);
    if (business.email) contactParts.push(business.email);
    
    return contactParts.length > 0 ? `${contactParts.join(' | ')}<br>` : '';
  }

  /**
   * Format payment method for display
   */
  formatPaymentMethod(method) {
    const methods = {
      'cash': 'Cash',
      'credit_card': 'Credit Card',
      'debit_card': 'Debit Card',
      'mobile_money': 'Mobile Money',
      'bank_transfer': 'Bank Transfer',
      'check': 'Check'
    };
    return methods[method] || method;
  }

  /**
   * Generate receipt for email (HTML format)
   */
  generateEmailReceipt(receiptData) {
    const htmlContent = this.generateHTMLReceipt(receiptData);
    
    return {
      subject: `Receipt #${receiptData.receipt.number} - ${receiptData.business.name}`,
      html: htmlContent,
      text: this.generateTextReceipt(receiptData)
    };
  }

  /**
   * Generate plain text receipt for SMS/WhatsApp
   */
  generateTextReceipt(receiptData) {
    const { receipt, business, customer, items, totals, payment, notes, currencySymbol = '$' } = receiptData;
    
    let text = '';
    // Only add business name if it exists
    if (business.name) {
      text += `${business.name}\n`;
    }
    
    // Only add address if it exists
    if (business.address) {
      text += `${business.address}\n`;
    }
    
    // Only add contact info if phone or email exists
    const contactParts = [];
    if (business.phone) contactParts.push(business.phone);
    if (business.email) contactParts.push(business.email);
    if (contactParts.length > 0) {
      text += `${contactParts.join(' | ')}\n`;
    }
    
    // Only add website if it exists
    if (business.website) {
      text += `${business.website}\n`;
    }
    
    text += `==========================================\n`;
    text += `Receipt #: ${receipt.number}\n`;
    text += `Date: ${receipt.date} ${receipt.time}\n`;
    text += `Cashier: ${receipt.cashier}\n`;
    if (customer.name !== 'Walk-in Customer') {
      text += `Customer: ${customer.name}\n`;
    }
    text += `==========================================\n`;
    
    items.forEach(item => {
      // Support both 'price' and 'unit_price' field names
      const itemPrice = item.price !== undefined ? item.price : (item.unit_price || 0);
      const backorderNote = item.isBackorder ? ' (BACKORDER)' : 
                           item.isPartialBackorder ? ` (${item.backorderQuantity} BACKORDER)` : '';
      text += `${item.name}${backorderNote}\n`;
      text += `  ${item.quantity} x ${currencySymbol}${itemPrice} = ${currencySymbol}${(itemPrice * item.quantity).toFixed(2)}\n`;
      if (item.isBackorder) {
        text += `  ** OUT OF STOCK - BACKORDER **\n`;
      } else if (item.isPartialBackorder) {
        text += `  ** ${item.backorderQuantity} items on backorder **\n`;
      }
    });
    
    text += `==========================================\n`;
    text += `Subtotal: ${currencySymbol}${totals.subtotal}\n`;
    
    if (parseFloat(totals.discount) > 0) {
      text += `Discount: -${currencySymbol}${totals.discount}\n`;
    }
    
    if (parseFloat(totals.tax) > 0) {
      text += `Tax (${totals.taxRate}%): ${currencySymbol}${totals.tax}\n`;
    }
    
    text += `==========================================\n`;
    text += `TOTAL: ${currencySymbol}${totals.total}\n`;
    text += `Payment: ${this.formatPaymentMethod(payment.method)}\n`;
    
    if (payment.method === 'cash') {
      text += `Amount Tendered: ${currencySymbol}${payment.amountTendered}\n`;
      if (parseFloat(payment.changeDue) > 0) {
        text += `Change Due: ${currencySymbol}${payment.changeDue}\n`;
      }
    } else {
      text += `Amount Paid: ${currencySymbol}${payment.amount}\n`;
    }
    
    if (notes) {
      text += `\nNotes: ${notes}\n`;
    }
    
    text += `\nThank you for your business!\n`;
    text += `Generated on ${new Date().toLocaleString()}`;
    
    return text;
  }

  /**
   * Generate WhatsApp shareable message
   */
  generateWhatsAppMessage(receiptData) {
    const textReceipt = this.generateTextReceipt(receiptData);
    
    // URL encode for WhatsApp
    return encodeURIComponent(textReceipt);
  }
}

export default ReceiptGenerator;