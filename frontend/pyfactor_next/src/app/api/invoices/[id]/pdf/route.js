import { NextResponse } from 'next/server';
import { applyRLS } from '@/middleware/dev-tenant-middleware';
import puppeteer from 'puppeteer';
import { createReadStream } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a PDF of an invoice
 */
export async function GET(request, { params }) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  
  // Extract tenant from request
  const tenantId = searchParams.get('tenantId') || 
                   request.headers.get('x-tenant-id') || 
                   'default-tenant';
  
  try {
    // In development, return a mock PDF
    if (process.env.NODE_ENV !== 'production') {
      // Create a simple invoice PDF
      const invoiceHtml = `
        <html>
          <head>
            <title>Invoice #DEV-${id}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; margin-bottom: 30px; }
              .invoice-title { font-size: 24px; font-weight: bold; }
              .invoice-details { margin-bottom: 30px; }
              .customer-details { margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f2f2f2; }
              .total-section { margin-top: 30px; text-align: right; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="invoice-title">INVOICE</div>
              <div>Invoice #DEV-${id}</div>
            </div>
            
            <div class="invoice-details">
              <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
              <div><strong>Due Date:</strong> ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</div>
            </div>
            
            <div class="customer-details">
              <div><strong>Bill To:</strong></div>
              <div>Sample Customer</div>
              <div>123 Main Street</div>
              <div>Anytown, ST 12345</div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Sample Product</td>
                  <td>2</td>
                  <td>$100.00</td>
                  <td>$200.00</td>
                </tr>
                <tr>
                  <td>Sample Service</td>
                  <td>5</td>
                  <td>$50.00</td>
                  <td>$250.00</td>
                </tr>
              </tbody>
            </table>
            
            <div class="total-section">
              <div><strong>Subtotal:</strong> $450.00</div>
              <div><strong>Tax:</strong> $45.00</div>
              <div><strong>Total:</strong> $495.00</div>
            </div>
          </body>
        </html>
      `;
      
      try {
        // Generate a unique filename
        const filename = `${uuidv4()}.pdf`;
        const tempFile = join(tmpdir(), filename);
        
        // Launch headless browser to convert HTML to PDF
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        await page.setContent(invoiceHtml);
        
        // Generate PDF
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px'
          }
        });
        
        await browser.close();
        
        // Write to temp file
        await writeFile(tempFile, pdfBuffer);
        
        // Set response headers
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        headers.set('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);
        
        // Stream the PDF file
        const fileStream = createReadStream(tempFile);
        return new Response(fileStream, { headers });
      } catch (error) {
        console.error('[API] Error generating PDF in development:', error);
        return NextResponse.json({
          error: 'Failed to generate PDF in development',
          message: error.message
        }, { status: 500 });
      }
    }
    
    // Production mode - fetch invoice data and generate PDF
    try {
      // Get invoice data from database
      const { Pool } = require('pg');
      const pool = new Pool(config);
      
      // Apply RLS policy
      await applyRLS(pool, tenantId);
      
      // Get the schema name
      const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
      
      // Query the invoice
      const invoiceQuery = `
        SELECT i.*, c.name as customer_name 
        FROM "${schemaName}"."sales_invoice" i
        LEFT JOIN "${schemaName}"."crm_customer" c ON i.customer_id = c.id
        WHERE i.id = $1
      `;
      
      const invoiceResult = await pool.query(invoiceQuery, [id]);
      
      if (invoiceResult.rows.length === 0) {
        return NextResponse.json({
          error: 'Invoice not found'
        }, { status: 404 });
      }
      
      const invoice = invoiceResult.rows[0];
      
      // Query invoice items
      const itemsQuery = `
        SELECT * FROM "${schemaName}"."sales_invoiceitem" 
        WHERE invoice_id = $1
      `;
      
      const itemsResult = await pool.query(itemsQuery, [id]);
      const items = itemsResult.rows;
      
      // Generate HTML for the invoice
      const invoiceHtml = generateInvoiceHtml(invoice, items);
      
      // Generate a unique filename
      const filename = `${uuidv4()}.pdf`;
      const tempFile = join(tmpdir(), filename);
      
      // Launch headless browser
      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      await page.setContent(invoiceHtml);
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });
      
      await browser.close();
      
      // Write to temp file
      await writeFile(tempFile, pdfBuffer);
      
      // Set response headers
      const headers = new Headers();
      headers.set('Content-Type', 'application/pdf');
      headers.set('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);
      
      // Stream the PDF file
      const fileStream = createReadStream(tempFile);
      
      // Close the database connection
      await pool.end();
      
      return new Response(fileStream, { headers });
    } catch (error) {
      console.error('[API] Error generating PDF:', error);
      return NextResponse.json({
        error: 'Failed to generate PDF',
        message: error.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[API] Invoice PDF generation error:', error);
    return NextResponse.json({
      error: 'Error generating invoice PDF',
      message: error.message
    }, { status: 500 });
  }
}

// Helper function to generate invoice HTML
function generateInvoiceHtml(invoice, items) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  const formatCurrency = (amount) => {
    return parseFloat(amount).toFixed(2);
  };
  
  // Determine which template to use
  const template = invoice.invoice_style === 'modern' ? 'modern' : 'classic';
  
  // Modern template
  if (template === 'modern') {
    return `
      <html>
        <head>
          <title>Invoice #${invoice.invoice_number}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 50px; }
            .logo-area { flex: 1; }
            .invoice-info { text-align: right; }
            .invoice-title { font-size: 28px; font-weight: bold; color: ${invoice.accent_color || '#000080'}; margin-bottom: 10px; }
            .invoice-number { font-size: 16px; margin-bottom: 5px; }
            .invoice-date { font-size: 14px; color: #666; }
            .addresses { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .address-block { flex: 1; max-width: 45%; }
            .address-block h3 { font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 10px; font-weight: 600; }
            .address-block p { margin: 3px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { text-align: left; padding: 12px 8px; border-bottom: 2px solid ${invoice.accent_color || '#000080'}; font-weight: 600; }
            td { padding: 12px 8px; border-bottom: 1px solid #eee; }
            .item-description { font-weight: 500; }
            .item-detail { font-size: 13px; color: #666; }
            .totals { margin-left: auto; width: 300px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .totals-row.final { font-weight: bold; color: ${invoice.accent_color || '#000080'}; border-top: 1px solid #eee; padding-top: 12px; margin-top: 12px; }
            .footer { text-align: center; margin-top: 50px; font-size: 14px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-area">
              <div class="invoice-title">INVOICE</div>
            </div>
            <div class="invoice-info">
              <div class="invoice-number">#${invoice.invoice_number}</div>
              <div class="invoice-date">Issue Date: ${formatDate(invoice.issue_date)}</div>
              <div class="invoice-date">Due Date: ${formatDate(invoice.due_date)}</div>
            </div>
          </div>
          
          <div class="addresses">
            <div class="address-block">
              <h3>From</h3>
              <p><strong>Your Company Name</strong></p>
              <p>123 Business Street</p>
              <p>Business City, ST 12345</p>
              <p>accounting@yourcompany.com</p>
            </div>
            
            <div class="address-block">
              <h3>Bill To</h3>
              <p><strong>${invoice.customer_name}</strong></p>
              <p>Customer Address Line 1</p>
              <p>Customer City, ST 12345</p>
              <p>customer@example.com</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right">Quantity</th>
                <th style="text-align: right">Unit Price</th>
                <th style="text-align: right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>
                    <div class="item-description">${item.description}</div>
                    <div class="item-detail">Additional details about this item</div>
                  </td>
                  <td style="text-align: right">${item.quantity}</td>
                  <td style="text-align: right">$${formatCurrency(item.unit_price)}</td>
                  <td style="text-align: right">$${formatCurrency(item.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row">
              <div>Subtotal</div>
              <div>$${formatCurrency(invoice.subtotal)}</div>
            </div>
            <div class="totals-row">
              <div>Tax</div>
              <div>$${formatCurrency(invoice.tax_total)}</div>
            </div>
            <div class="totals-row final">
              <div>Total</div>
              <div>$${formatCurrency(invoice.total)}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
          </div>
        </body>
      </html>
    `;
  } 
  // Classic template
  else {
    return `
      <html>
        <head>
          <title>Invoice #${invoice.invoice_number}</title>
          <style>
            body { font-family: Times, 'Times New Roman', serif; margin: 0; padding: 40px; color: #000; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #000; padding-bottom: 20px; }
            .invoice-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .invoice-number { font-size: 16px; }
            .dates { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .date-block { border: 1px solid #000; padding: 15px; width: 45%; }
            .date-block h3 { margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
            .addresses { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .address-block { border: 1px solid #000; padding: 15px; width: 45%; }
            .address-block h3 { margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #000; }
            th { background-color: #f0f0f0; padding: 10px; border-bottom: 1px solid #000; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #ccc; }
            .amount-col { text-align: right; }
            .summary { border: 1px solid #000; padding: 15px; width: 300px; margin-left: auto; }
            .summary h3 { margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
            .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .summary-row.total { border-top: 1px solid #000; margin-top: 10px; padding-top: 10px; font-weight: bold; }
            .terms { border: 1px solid #000; padding: 15px; margin-bottom: 30px; }
            .terms h3 { margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
            .footer { text-align: center; margin-top: 50px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">Invoice #${invoice.invoice_number}</div>
          </div>
          
          <div class="dates">
            <div class="date-block">
              <h3>Date of Issue</h3>
              <p>${formatDate(invoice.issue_date)}</p>
            </div>
            <div class="date-block">
              <h3>Due Date</h3>
              <p>${formatDate(invoice.due_date)}</p>
            </div>
          </div>
          
          <div class="addresses">
            <div class="address-block">
              <h3>From</h3>
              <p><strong>Your Company Name</strong></p>
              <p>123 Business Street</p>
              <p>Business City, ST 12345</p>
              <p>accounting@yourcompany.com</p>
            </div>
            
            <div class="address-block">
              <h3>Bill To</h3>
              <p><strong>${invoice.customer_name}</strong></p>
              <p>Customer Address Line 1</p>
              <p>Customer City, ST 12345</p>
              <p>customer@example.com</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th class="amount-col">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>$${formatCurrency(item.unit_price)}</td>
                  <td class="amount-col">$${formatCurrency(item.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <h3>Invoice Summary</h3>
            <div class="summary-row">
              <div>Subtotal:</div>
              <div>$${formatCurrency(invoice.subtotal)}</div>
            </div>
            <div class="summary-row">
              <div>Tax:</div>
              <div>$${formatCurrency(invoice.tax_total)}</div>
            </div>
            <div class="summary-row total">
              <div>Total:</div>
              <div>$${formatCurrency(invoice.total)}</div>
            </div>
          </div>
          
          <div class="terms">
            <h3>Payment Terms</h3>
            <p>${invoice.terms || 'Payment is due within 30 days.'}</p>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
          </div>
        </body>
      </html>
    `;
  }
} 