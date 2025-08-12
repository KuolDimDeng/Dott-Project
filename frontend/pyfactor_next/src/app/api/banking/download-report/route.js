import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

export async function GET(request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const reportType = searchParams.get('report_type');
    const format = searchParams.get('format') || 'pdf';

    // Generate mock report data
    const reportData = {
      title: `${reportType?.replace('-', ' ').toUpperCase()} REPORT`,
      period: `${startDate} to ${endDate}`,
      account: accountId === 'all' ? 'All Accounts' : 'Selected Account',
      summary: {
        total_income: 15000,
        total_expenses: 12000,
        net_cash_flow: 3000,
        starting_balance: 20000,
        ending_balance: 23000
      },
      categories: [
        { name: 'Sales', amount: 10000, type: 'income' },
        { name: 'Services', amount: 5000, type: 'income' },
        { name: 'Payroll', amount: -6000, type: 'expense' },
        { name: 'Rent', amount: -3000, type: 'expense' },
        { name: 'Utilities', amount: -1500, type: 'expense' },
        { name: 'Supplies', amount: -1500, type: 'expense' }
      ]
    };

    if (format === 'excel') {
      // Generate Excel file
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');

      // Add title and period
      worksheet.addRow([reportData.title]);
      worksheet.addRow([`Period: ${reportData.period}`]);
      worksheet.addRow([`Account: ${reportData.account}`]);
      worksheet.addRow([]);

      // Add summary
      worksheet.addRow(['SUMMARY']);
      worksheet.addRow(['Total Income', reportData.summary.total_income]);
      worksheet.addRow(['Total Expenses', reportData.summary.total_expenses]);
      worksheet.addRow(['Net Cash Flow', reportData.summary.net_cash_flow]);
      worksheet.addRow(['Starting Balance', reportData.summary.starting_balance]);
      worksheet.addRow(['Ending Balance', reportData.summary.ending_balance]);
      worksheet.addRow([]);

      // Add categories
      worksheet.addRow(['CATEGORIES']);
      worksheet.addRow(['Category', 'Amount', 'Type']);
      reportData.categories.forEach(cat => {
        worksheet.addRow([cat.name, Math.abs(cat.amount), cat.type]);
      });

      // Style the worksheet
      worksheet.getColumn(1).width = 30;
      worksheet.getColumn(2).width = 15;
      worksheet.getColumn(3).width = 15;

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${reportType}_${startDate}_${endDate}.xlsx"`
        }
      });
    } else {
      // Generate PDF (simplified version - in production you'd use a proper PDF library)
      const pdfContent = `
${reportData.title}
Period: ${reportData.period}
Account: ${reportData.account}

SUMMARY
=======
Total Income: $${reportData.summary.total_income}
Total Expenses: $${reportData.summary.total_expenses}
Net Cash Flow: $${reportData.summary.net_cash_flow}
Starting Balance: $${reportData.summary.starting_balance}
Ending Balance: $${reportData.summary.ending_balance}

CATEGORIES
==========
${reportData.categories.map(cat => `${cat.name}: ${cat.type === 'income' ? '+' : '-'}$${Math.abs(cat.amount)}`).join('\n')}
      `;

      return new NextResponse(pdfContent, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${reportType}_${startDate}_${endDate}.pdf"`
        }
      });
    }

  } catch (error) {
    console.error('[Download Report] Error:', error);
    return NextResponse.json({ error: 'Failed to download report' }, { status: 500 });
  }
}