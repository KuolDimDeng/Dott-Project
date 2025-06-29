import { NextResponse } from 'next/server';
import { getSecureSession } from '@/utils/sessionUtils-v2';
import { standardSecurityHeaders } from '@/utils/responseHeaders';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function POST(request) {
  try {
    const session = await getSecureSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { worksheetData, tenantId } = await request.json();
    
    if (!worksheetData || !tenantId) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();
    
    // Load fonts
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Helper function to draw text
    const drawText = (text, x, y, size = 12, font = helvetica, color = rgb(0, 0, 0)) => {
      page.drawText(text, {
        x,
        y: height - y,
        size,
        font,
        color
      });
    };
    
    // Header
    drawText('TAX WORKSHEET', width / 2 - 80, 50, 20, helveticaBold);
    drawText(`Period: ${worksheetData.period.start} - ${worksheetData.period.end}`, width / 2 - 100, 80, 12);
    
    // Business Information Section
    let yPos = 120;
    drawText('BUSINESS INFORMATION', 50, yPos, 14, helveticaBold);
    yPos += 25;
    drawText(`Business Name: ${worksheetData.businessInfo.name}`, 50, yPos);
    yPos += 20;
    drawText(`Tax ID/EIN: ${worksheetData.businessInfo.taxId || 'Not provided'}`, 50, yPos);
    yPos += 20;
    drawText(`Address: ${worksheetData.businessInfo.address}`, 50, yPos);
    yPos += 20;
    drawText(`Email: ${worksheetData.businessInfo.email}`, 50, yPos);
    yPos += 20;
    if (worksheetData.businessInfo.phone) {
      drawText(`Phone: ${worksheetData.businessInfo.phone}`, 50, yPos);
      yPos += 20;
    }
    
    // Financial Summary Section
    yPos += 30;
    drawText('FINANCIAL SUMMARY', 50, yPos, 14, helveticaBold);
    yPos += 25;
    
    // Create a simple table
    const drawRow = (label, amount, isHeader = false) => {
      const font = isHeader ? helveticaBold : helvetica;
      drawText(label, 50, yPos, 11, font);
      drawText(`$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
        width - 150, yPos, 11, font);
      yPos += 20;
    };
    
    drawRow('Total Sales', worksheetData.financials.totalSales);
    drawRow('Taxable Sales', worksheetData.financials.taxableSales);
    drawRow('Total Income', worksheetData.financials.totalIncome);
    drawRow('Total Expenses', worksheetData.financials.totalExpenses);
    drawRow('Net Income', worksheetData.financials.netIncome);
    
    // Tax Calculations Section
    yPos += 30;
    drawText('TAX CALCULATIONS', 50, yPos, 14, helveticaBold);
    yPos += 25;
    
    drawText(`Sales Tax (${worksheetData.taxCalculations.salesTax.rate}%)`, 50, yPos);
    drawText(`$${worksheetData.taxCalculations.salesTax.amount.toFixed(2)}`, width - 150, yPos);
    yPos += 20;
    
    drawText(`Income Tax (${worksheetData.taxCalculations.incomeTax.rate}%)`, 50, yPos);
    drawText(`$${worksheetData.taxCalculations.incomeTax.amount.toFixed(2)}`, width - 150, yPos);
    yPos += 20;
    
    // Draw a line
    page.drawLine({
      start: { x: width - 200, y: height - yPos - 5 },
      end: { x: width - 50, y: height - yPos - 5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    yPos += 10;
    drawText('TOTAL TAX DUE', 50, yPos, 12, helveticaBold);
    drawText(`$${worksheetData.taxCalculations.totalTaxDue.toFixed(2)}`, 
      width - 150, yPos, 12, helveticaBold);
    
    // Footer
    yPos = height - 100;
    page.drawLine({
      start: { x: 50, y: yPos },
      end: { x: width - 50, y: yPos },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    drawText('This worksheet is for informational purposes only.', 50, height - 80, 10, helvetica, rgb(0.5, 0.5, 0.5));
    drawText('Please consult with a tax professional for official filing.', 50, height - 60, 10, helvetica, rgb(0.5, 0.5, 0.5));
    drawText(`Generated on ${new Date().toLocaleDateString()}`, 50, height - 40, 10, helvetica, rgb(0.5, 0.5, 0.5));
    
    // Serialize the PDFDocument to bytes
    const pdfBytes = await pdfDoc.save();
    
    // Return the PDF as a response
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        ...standardSecurityHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="tax-worksheet-${Date.now()}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[generate-worksheet] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate worksheet' },
      { status: 500, headers: standardSecurityHeaders }
    );
  }
}