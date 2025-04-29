import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getDbConfigFromEnv } from '@/utils/db-config';
import { createServerLogger } from '@/utils/serverLogger';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { parse } from 'url';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EOL } from 'os';

const logger = createServerLogger('payroll-export-api');

/**
 * API endpoint for exporting payroll reports in PDF format using real data from AWS RDS
 * 
 * @route POST /api/payroll/export-report
 * @param {string} report_type - Type of report (summary, detailed, tax, benefits)
 * @param {string} time_frame - Time frame for the report (ytd, q1, q2, q3, q4, last12)
 * @param {string[]} department_ids - Array of department IDs to include
 * @param {string} format - Export format (pdf or csv)
 * @returns {Buffer} PDF or CSV file as a stream
 */
export async function POST(req) {
  try {
    // Get authenticated user to ensure proper authorization
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has permission to access payroll reports
    if (!user.isOwner && !user.permissions?.includes('view_payroll_reports')) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { report_type, time_frame, department_ids, format = 'pdf' } = body;
    
    if (!report_type || !time_frame || !department_ids || !Array.isArray(department_ids)) {
      return NextResponse.json(
        { message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Connect to AWS RDS database
    const pool = new Pool(getDbConfigFromEnv());
    
    try {
      // Determine date range based on time_frame
      const dateRange = getDateRangeFromTimeFrame(time_frame);
      
      // Get tenant-specific schema
      const tenantId = user.tenant_id || user.company?.id;
      const schema = `tenant_${tenantId.replace(/-/g, '_')}`;
      
      // Base query for payroll data within the specified date range
      const baseQuery = {
        text: `
          SELECT 
            p.id,
            p.employee_id,
            p.gross_pay,
            p.net_pay,
            p.federal_tax,
            p.state_tax,
            p.fica_tax,
            p.medicare_tax,
            p.health_insurance,
            p.retirement_401k,
            p.other_benefits,
            e.department_id,
            d.name as department_name,
            e.first_name || ' ' || e.last_name as employee_name
          FROM "${schema}".payroll_transactions p
          JOIN "${schema}".employees e ON p.employee_id = e.id
          JOIN "${schema}".departments d ON e.department_id = d.id
          WHERE p.pay_date BETWEEN $1 AND $2
          ${department_ids.includes('all') ? '' : 'AND e.department_id IN (SELECT UNNEST($3::uuid[]))'}
          ORDER BY e.last_name, e.first_name
        `,
        values: [
          dateRange.startDate,
          dateRange.endDate,
          department_ids.includes('all') ? null : department_ids
        ]
      };
      
      // Also get company info
      const companyQuery = {
        text: `
          SELECT name, logo_url, address, city, state, zip
          FROM "${schema}".company
          LIMIT 1
        `
      };
      
      // Execute queries in parallel
      const [payrollResult, companyResult] = await Promise.all([
        pool.query(baseQuery),
        pool.query(companyQuery)
      ]);
      
      if (payrollResult.rows.length === 0) {
        return NextResponse.json(
          { message: 'No payroll data found for the specified criteria' },
          { status: 404 }
        );
      }
      
      // Process data into report format
      const reportData = processPayrollData(payrollResult.rows, report_type);
      const companyInfo = companyResult.rows[0] || { name: 'Your Company' };
      
      // Format the report based on requested format
      if (format.toLowerCase() === 'csv') {
        const csvContent = generateCSV(reportData, companyInfo, dateRange);
        
        // Return CSV as a download
        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="payroll_report_${time_frame}.csv"`
          }
        });
      }
      
      // Default to PDF format
      const pdfBuffer = await generatePDF(reportData, companyInfo, dateRange, time_frame, report_type);
      
      // Return the PDF as a download
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="payroll_report_${time_frame}.pdf"`
        }
      });
    } finally {
      await pool.end();
    }
  } catch (error) {
    logger.error('Error exporting payroll report:', error);
    return NextResponse.json(
      { message: 'Error exporting report: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper function to determine date range based on time frame
 */
function getDateRangeFromTimeFrame(timeFrame) {
  const now = new Date();
  const currentYear = now.getFullYear();
  let startDate, endDate;
  
  switch (timeFrame) {
    case 'ytd': // Year to date
      startDate = new Date(currentYear, 0, 1); // Jan 1 of current year
      endDate = now;
      break;
    case 'q1':
      startDate = new Date(currentYear, 0, 1); // Jan 1
      endDate = new Date(currentYear, 2, 31); // Mar 31
      break;
    case 'q2':
      startDate = new Date(currentYear, 3, 1); // Apr 1
      endDate = new Date(currentYear, 5, 30); // Jun 30
      break;
    case 'q3':
      startDate = new Date(currentYear, 6, 1); // Jul 1
      endDate = new Date(currentYear, 8, 30); // Sep 30
      break;
    case 'q4':
      startDate = new Date(currentYear, 9, 1); // Oct 1
      endDate = new Date(currentYear, 11, 31); // Dec 31
      break;
    case 'last12':
      startDate = new Date();
      startDate.setFullYear(now.getFullYear() - 1);
      endDate = now;
      break;
    default:
      startDate = new Date(currentYear, 0, 1); // Default to YTD
      endDate = now;
  }
  
  // Format dates as strings
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    startDateFormatted: startDate.toLocaleDateString(),
    endDateFormatted: endDate.toLocaleDateString()
  };
}

/**
 * Process payroll data into report format
 */
function processPayrollData(rows, reportType) {
  // Calculate summary totals
  const totalGrossPay = rows.reduce((sum, row) => sum + Number(row.gross_pay), 0);
  const totalNetPay = rows.reduce((sum, row) => sum + Number(row.net_pay), 0);
  
  // Calculate tax totals
  const federalTax = rows.reduce((sum, row) => sum + Number(row.federal_tax || 0), 0);
  const stateTax = rows.reduce((sum, row) => sum + Number(row.state_tax || 0), 0);
  const ficaTax = rows.reduce((sum, row) => sum + Number(row.fica_tax || 0), 0);
  const medicareTax = rows.reduce((sum, row) => sum + Number(row.medicare_tax || 0), 0);
  const totalTax = federalTax + stateTax + ficaTax + medicareTax;
  
  // Calculate benefit totals
  const healthInsurance = rows.reduce((sum, row) => sum + Number(row.health_insurance || 0), 0);
  const retirement401k = rows.reduce((sum, row) => sum + Number(row.retirement_401k || 0), 0);
  const otherBenefits = rows.reduce((sum, row) => sum + Number(row.other_benefits || 0), 0);
  const totalDeductions = healthInsurance + retirement401k + otherBenefits;
  
  // Calculate department totals
  const departmentMap = new Map();
  rows.forEach(row => {
    const deptId = row.department_id;
    const deptName = row.department_name;
    const amount = Number(row.gross_pay);
    
    if (departmentMap.has(deptId)) {
      departmentMap.get(deptId).amount += amount;
    } else {
      departmentMap.set(deptId, { name: deptName, amount });
    }
  });
  
  // Convert department map to array and calculate percentages
  const departments = Array.from(departmentMap.values()).map(dept => ({
    name: dept.name,
    amount: dept.amount,
    percentage: Math.round((dept.amount / totalGrossPay) * 100 * 10) / 10
  }));
  
  // Get detailed employee data if requested
  const employees = reportType === 'detailed' ? rows.map(row => ({
    name: row.employee_name,
    department: row.department_name,
    grossPay: Number(row.gross_pay),
    federalTax: Number(row.federal_tax || 0),
    stateTax: Number(row.state_tax || 0),
    ficaTax: Number(row.fica_tax || 0) + Number(row.medicare_tax || 0),
    benefits: Number(row.health_insurance || 0) + Number(row.retirement_401k || 0) + Number(row.other_benefits || 0),
    netPay: Number(row.net_pay),
  })) : [];
  
  // Build report object
  return {
    summary: {
      grossPay: totalGrossPay,
      netPay: totalNetPay,
      totalTax: totalTax,
      employeeCount: new Set(rows.map(row => row.employee_id)).size
    },
    departments,
    taxWithholding: {
      federal: federalTax,
      state: stateTax,
      fica: ficaTax + medicareTax,
      total: totalTax,
      percentOfGross: Math.round((totalTax / totalGrossPay) * 100 * 10) / 10
    },
    deductions: {
      healthInsurance: healthInsurance,
      retirement401k: retirement401k,
      otherBenefits: otherBenefits,
      total: totalDeductions,
      percentOfGross: Math.round((totalDeductions / totalGrossPay) * 100 * 10) / 10
    },
    employees
  };
}

/**
 * Generate a CSV string from the payroll data
 */
function generateCSV(reportData, companyInfo, dateRange) {
  const formatCurrency = (amount) => `$${amount.toFixed(2)}`;
  const { summary, departments, taxWithholding, deductions, employees } = reportData;
  
  let csvContent = [];
  
  // Add header
  csvContent.push(`Payroll Report - ${companyInfo.name}`);
  csvContent.push(`Date Range: ${dateRange.startDateFormatted} to ${dateRange.endDateFormatted}`);
  csvContent.push('');
  
  // Add summary section
  csvContent.push('Summary');
  csvContent.push(`Total Gross Pay,${formatCurrency(summary.grossPay)}`);
  csvContent.push(`Total Net Pay,${formatCurrency(summary.netPay)}`);
  csvContent.push(`Total Tax,${formatCurrency(summary.totalTax)}`);
  csvContent.push(`Employee Count,${summary.employeeCount}`);
  csvContent.push('');
  
  // Add department breakdown
  csvContent.push('Department Breakdown');
  csvContent.push('Department,Amount,Percentage');
  departments.forEach(dept => {
    csvContent.push(`${dept.name},${formatCurrency(dept.amount)},${dept.percentage}%`);
  });
  csvContent.push('');
  
  // Add tax breakdown
  csvContent.push('Tax Withholdings');
  csvContent.push(`Federal Tax,${formatCurrency(taxWithholding.federal)}`);
  csvContent.push(`State Tax,${formatCurrency(taxWithholding.state)}`);
  csvContent.push(`FICA & Medicare,${formatCurrency(taxWithholding.fica)}`);
  csvContent.push(`Total Tax,${formatCurrency(taxWithholding.total)}`);
  csvContent.push(`Percent of Gross,${taxWithholding.percentOfGross}%`);
  csvContent.push('');
  
  // Add deductions breakdown
  csvContent.push('Benefit Deductions');
  csvContent.push(`Health Insurance,${formatCurrency(deductions.healthInsurance)}`);
  csvContent.push(`401(k),${formatCurrency(deductions.retirement401k)}`);
  csvContent.push(`Other Benefits,${formatCurrency(deductions.otherBenefits)}`);
  csvContent.push(`Total Deductions,${formatCurrency(deductions.total)}`);
  csvContent.push(`Percent of Gross,${deductions.percentOfGross}%`);
  csvContent.push('');
  
  // Add employee details if available
  if (employees && employees.length > 0) {
    csvContent.push('Employee Details');
    csvContent.push('Name,Department,Gross Pay,Federal Tax,State Tax,FICA,Benefits,Net Pay');
    employees.forEach(emp => {
      csvContent.push(`${emp.name},${emp.department},${formatCurrency(emp.grossPay)},${formatCurrency(emp.federalTax)},${formatCurrency(emp.stateTax)},${formatCurrency(emp.ficaTax)},${formatCurrency(emp.benefits)},${formatCurrency(emp.netPay)}`);
    });
  }
  
  return csvContent.join(EOL);
}

/**
 * Generate a PDF from the payroll data using Puppeteer
 */
async function generatePDF(reportData, companyInfo, dateRange, timeFrame, reportType) {
  // Format for currency display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Generate HTML content for the PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payroll Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        }
        .logo {
          max-width: 150px;
          max-height: 60px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          margin: 10px 0;
        }
        .report-title {
          font-size: 18px;
          margin: 5px 0;
        }
        .date-range {
          font-size: 14px;
          color: #666;
        }
        .section {
          margin: 20px 0;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 15px;
        }
        .summary-box {
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          padding: 10px;
          border-radius: 5px;
        }
        .summary-label {
          font-size: 12px;
          color: #666;
        }
        .summary-value {
          font-size: 18px;
          font-weight: bold;
          margin-top: 5px;
        }
        .gross-pay { color: #0066cc; }
        .net-pay { color: #009933; }
        .total-tax { color: #cc3300; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .grid-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .right-align {
          text-align: right;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${companyInfo.logo_url ? `<img src="${companyInfo.logo_url}" class="logo" alt="${companyInfo.name} Logo">` : ''}
        <div class="company-name">${companyInfo.name}</div>
        <div class="report-title">Payroll Report - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}</div>
        <div class="date-range">${dateRange.startDateFormatted} to ${dateRange.endDateFormatted}</div>
        ${companyInfo.address ? `<div class="date-range">${companyInfo.address}, ${companyInfo.city}, ${companyInfo.state} ${companyInfo.zip}</div>` : ''}
      </div>
      
      <div class="section">
        <div class="section-title">Summary</div>
        <div class="summary-grid">
          <div class="summary-box">
            <div class="summary-label">Gross Pay</div>
            <div class="summary-value gross-pay">${formatCurrency(reportData.summary.grossPay)}</div>
          </div>
          <div class="summary-box">
            <div class="summary-label">Net Pay</div>
            <div class="summary-value net-pay">${formatCurrency(reportData.summary.netPay)}</div>
          </div>
          <div class="summary-box">
            <div class="summary-label">Total Tax</div>
            <div class="summary-value total-tax">${formatCurrency(reportData.summary.totalTax)}</div>
          </div>
        </div>
        <div>Total Employees: ${reportData.summary.employeeCount}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Department Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th>Amount</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.departments.map(dept => `
              <tr>
                <td>${dept.name}</td>
                <td>${formatCurrency(dept.amount)}</td>
                <td>${dept.percentage}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="grid-container">
        <div class="section">
          <div class="section-title">Tax Withholdings</div>
          <table>
            <tr>
              <td>Federal Tax</td>
              <td class="right-align">${formatCurrency(reportData.taxWithholding.federal)}</td>
            </tr>
            <tr>
              <td>State Tax</td>
              <td class="right-align">${formatCurrency(reportData.taxWithholding.state)}</td>
            </tr>
            <tr>
              <td>FICA & Medicare</td>
              <td class="right-align">${formatCurrency(reportData.taxWithholding.fica)}</td>
            </tr>
            <tr>
              <th>Total Tax</th>
              <th class="right-align">${formatCurrency(reportData.taxWithholding.total)}</th>
            </tr>
            <tr>
              <td>Percent of Gross</td>
              <td class="right-align">${reportData.taxWithholding.percentOfGross}%</td>
            </tr>
          </table>
        </div>
        
        <div class="section">
          <div class="section-title">Benefit Deductions</div>
          <table>
            <tr>
              <td>Health Insurance</td>
              <td class="right-align">${formatCurrency(reportData.deductions.healthInsurance)}</td>
            </tr>
            <tr>
              <td>401(k)</td>
              <td class="right-align">${formatCurrency(reportData.deductions.retirement401k)}</td>
            </tr>
            <tr>
              <td>Other Benefits</td>
              <td class="right-align">${formatCurrency(reportData.deductions.otherBenefits)}</td>
            </tr>
            <tr>
              <th>Total Deductions</th>
              <th class="right-align">${formatCurrency(reportData.deductions.total)}</th>
            </tr>
            <tr>
              <td>Percent of Gross</td>
              <td class="right-align">${reportData.deductions.percentOfGross}%</td>
            </tr>
          </table>
        </div>
      </div>
      
      ${reportData.employees && reportData.employees.length > 0 ? `
        <div class="section">
          <div class="section-title">Employee Details</div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Gross Pay</th>
                <th>Fed Tax</th>
                <th>State Tax</th>
                <th>FICA</th>
                <th>Benefits</th>
                <th>Net Pay</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.employees.map(emp => `
                <tr>
                  <td>${emp.name}</td>
                  <td>${emp.department}</td>
                  <td>${formatCurrency(emp.grossPay)}</td>
                  <td>${formatCurrency(emp.federalTax)}</td>
                  <td>${formatCurrency(emp.stateTax)}</td>
                  <td>${formatCurrency(emp.ficaTax)}</td>
                  <td>${formatCurrency(emp.benefits)}</td>
                  <td>${formatCurrency(emp.netPay)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      
      <div class="footer">
        Generated on ${new Date().toLocaleDateString()} - Confidential Payroll Information
      </div>
    </body>
    </html>
  `;
  
  // Use Puppeteer to generate PDF
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
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
    
    return pdfBuffer;
  } finally {
    await browser.close();
  }
} 