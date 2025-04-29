import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getDbConfigFromEnv } from '@/utils/db-config';
import { createServerLogger } from '@/utils/serverLogger';
import { getAuthenticatedUser } from '@/lib/auth-utils';

const logger = createServerLogger('payroll-reports-api');

/**
 * API endpoint for generating payroll reports using real data from AWS RDS
 * 
 * @route POST /api/payroll/reports
 * @param {string} report_type - Type of report (summary, detailed, tax, benefits)
 * @param {string} time_frame - Time frame for the report (ytd, q1, q2, q3, q4, last12)
 * @param {string[]} department_ids - Array of department IDs to include
 * @returns {object} Report data
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
    const { report_type, time_frame, department_ids } = body;
    
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
            d.name as department_name
          FROM "${schema}".payroll_transactions p
          JOIN "${schema}".employees e ON p.employee_id = e.id
          JOIN "${schema}".departments d ON e.department_id = d.id
          WHERE p.pay_date BETWEEN $1 AND $2
          ${department_ids.includes('all') ? '' : 'AND e.department_id IN (SELECT UNNEST($3::uuid[]))'}
        `,
        values: [
          dateRange.startDate,
          dateRange.endDate,
          department_ids.includes('all') ? null : department_ids
        ]
      };
      
      // Execute query
      const result = await pool.query(baseQuery);
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { message: 'No payroll data found for the specified criteria' },
          { status: 404 }
        );
      }
      
      // Process data into report format
      const reportData = processPayrollData(result.rows, report_type);
      
      return NextResponse.json(reportData);
    } finally {
      await pool.end();
    }
  } catch (error) {
    logger.error('Error generating payroll report:', error);
    return NextResponse.json(
      { message: 'Error generating report: ' + error.message },
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
    endDate: endDate.toISOString().split('T')[0]
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
    }
  };
} 