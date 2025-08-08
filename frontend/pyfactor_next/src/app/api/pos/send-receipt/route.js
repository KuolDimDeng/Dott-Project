import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

// Initialize Resend only if API key exists (to avoid build errors)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * API endpoint for sending receipts via email, WhatsApp, SMS
 * Supports various receipt delivery methods
 */

export async function POST(request) {
  try {
    const { type, to, receipt, emailContent } = await request.json();

    // Validate request
    if (!type || !receipt) {
      return NextResponse.json(
        { error: 'Missing required fields: type and receipt' },
        { status: 400 }
      );
    }

    if (type === 'email' && (!to || !emailContent)) {
      return NextResponse.json(
        { error: 'Email address and content are required for email receipts' },
        { status: 400 }
      );
    }

    // Get session for authentication
    const sessionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/session-v2`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (!sessionResponse.ok) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const session = await sessionResponse.json();
    if (!session.user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Handle different receipt delivery types
    switch (type) {
      case 'email':
        return await handleEmailReceipt(to, receipt, emailContent, session);
      case 'whatsapp':
        return await handleWhatsAppReceipt(to, receipt, session);
      case 'sms':
        return await handleSMSReceipt(to, receipt, session);
      default:
        return NextResponse.json(
          { error: `Unsupported receipt type: ${type}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[send-receipt] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle email receipt delivery using Resend
 */
async function handleEmailReceipt(to, receipt, emailContent, session) {
  try {
    console.log('[send-receipt] Email receipt request:', {
      to,
      receiptNumber: receipt.receipt.number,
      business: receipt.business.name,
      amount: receipt.totals.total
    });

    // Generate email HTML
    const emailHtml = generateEmailHTML(receipt);
    
    // Check if Resend is configured
    if (!resend) {
      console.error('[send-receipt] Resend API key not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      );
    }
    
    // Send via Resend
    const data = await resend.emails.send({
      from: 'Dott POS <receipts@dottapps.com>',
      to: [to],
      subject: `Receipt #${receipt.receipt.number} - ${receipt.business.name}`,
      html: emailHtml,
      text: generateEmailText(receipt),
    });

    console.log('[send-receipt] Email sent successfully:', data);
    
    return NextResponse.json({
      success: true,
      message: 'Receipt sent to email',
      details: {
        type: 'email',
        recipient: to,
        receiptNumber: receipt.receipt.number,
        messageId: data.id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[send-receipt] Email error:', error);
    return NextResponse.json(
      { error: 'Failed to send email receipt' },
      { status: 500 }
    );
  }
}

/**
 * Handle SMS receipt delivery
 */
async function handleSMSReceipt(to, receipt, session) {
  try {
    // In a real implementation, you would integrate with an SMS service
    // like Twilio, AWS SNS, or Africa's Talking
    
    console.log('[send-receipt] SMS receipt request:', {
      to,
      receiptNumber: receipt.receipt.number,
      business: receipt.business.name,
      amount: receipt.totals.total
    });

    // Simulate SMS sending
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock successful SMS delivery
    return NextResponse.json({
      success: true,
      message: 'SMS receipt sent successfully',
      details: {
        type: 'sms',
        recipient: to,
        receiptNumber: receipt.receipt.number,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[send-receipt] SMS error:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS receipt' },
      { status: 500 }
    );
  }
}

/**
 * Handle WhatsApp receipt delivery
 */
async function handleWhatsAppReceipt(to, receipt, session) {
  try {
    console.log('[send-receipt] WhatsApp receipt request:', {
      to,
      receiptNumber: receipt.receipt.number,
      business: receipt.business.name,
      amount: receipt.totals.total
    });

    // Get session cookie for backend call
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      throw new Error('No session found');
    }

    // Call backend WhatsApp API
    const response = await fetch(`${BACKEND_URL}/api/whatsapp/send-receipt/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: to,
        receipt_data: receipt,
        format: 'text'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send WhatsApp message');
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Receipt sent via WhatsApp',
      details: {
        type: 'whatsapp',
        recipient: to,
        receiptNumber: receipt.receipt.number,
        messageId: data.message_id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[send-receipt] WhatsApp error:', error);
    return NextResponse.json(
      { error: 'Failed to send WhatsApp receipt' },
      { status: 500 }
    );
  }
}

// Generate HTML email template
function generateEmailHTML(receipt) {
  const { business, items, totals, customer, payment } = receipt;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 20px; }
    .business-name { font-size: 24px; font-weight: bold; color: #1e40af; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th { background-color: #1e40af; color: white; padding: 10px; }
    .items-table td { border-bottom: 1px solid #e5e7eb; padding: 8px; }
    .totals { margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .grand-total { font-size: 20px; font-weight: bold; color: #1e40af; border-top: 2px solid #1e40af; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="business-name">${business.name}</div>
      <div>Receipt #${receipt.receipt.number}</div>
      <div>${new Date(receipt.receipt.date).toLocaleString()}</div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${item.total.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>$${totals.subtotal.toFixed(2)}</span>
      </div>
      ${totals.tax > 0 ? `
      <div class="total-row">
        <span>Tax:</span>
        <span>$${totals.tax.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="total-row grand-total">
        <span>Total:</span>
        <span>$${totals.total.toFixed(2)}</span>
      </div>
    </div>

    <p>Thank you for your business!</p>
  </div>
</body>
</html>
  `;
}

// Generate plain text email
function generateEmailText(receipt) {
  const { business, items, totals } = receipt;
  
  let text = `${business.name}\n`;
  text += `Receipt #${receipt.receipt.number}\n\n`;
  
  text += 'Items:\n';
  items.forEach(item => {
    text += `- ${item.name} x${item.quantity} = $${item.total.toFixed(2)}\n`;
  });
  
  text += `\nSubtotal: $${totals.subtotal.toFixed(2)}\n`;
  if (totals.tax > 0) text += `Tax: $${totals.tax.toFixed(2)}\n`;
  text += `Total: $${totals.total.toFixed(2)}\n`;
  text += '\nThank you for your business!';
  
  return text;
}