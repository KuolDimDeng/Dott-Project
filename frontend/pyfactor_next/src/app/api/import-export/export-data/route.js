import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';
import { parse } from 'json2csv';

// Debug logging helper
function debugLog(category, message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`🔍 [${timestamp}] [export-data] [${category}] ${message}`, data);
}

// Helper to get session from cookies directly
async function getSessionFromCookies() {
  debugLog('SESSION', '=== Getting session from cookies ===');
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    
    debugLog('SESSION', 'Cookie check', {
      hasSid: !!sidCookie,
      hasSessionToken: !!sessionTokenCookie,
      sidValue: sidCookie?.value?.substring(0, 10) + '...',
      sessionTokenValue: sessionTokenCookie?.value?.substring(0, 10) + '...'
    });
    
    if (!sidCookie && !sessionTokenCookie) {
      debugLog('SESSION', 'No session cookies found');
      return null;
    }
    
    // Try to validate session with backend
    const sessionId = sidCookie?.value || sessionTokenCookie?.value;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    debugLog('SESSION', 'Validating session with backend', {
      apiUrl: API_URL,
      sessionIdPrefix: sessionId.substring(0, 10) + '...'
    });
    
    try {
      const response = await fetch(`${API_URL}/api/sessions/validate/${sessionId}/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      debugLog('SESSION', 'Backend validation response', {
        status: response.status,
        ok: response.ok
      });
      
      if (response.ok) {
        const sessionData = await response.json();
        debugLog('SESSION', 'Session validated successfully', {
          hasUser: !!sessionData.user,
          userEmail: sessionData.user?.email,
          userRole: sessionData.user?.role
        });
        return sessionData;
      }
    } catch (error) {
      debugLog('SESSION', 'Backend validation error', {
        error: error.message
      });
    }
    
    // If backend validation fails, try to parse session from cookie
    // This is a fallback for development/testing
    debugLog('SESSION', 'Falling back to cookie parsing');
    
    try {
      // For development, we might have session data in a cookie
      const devSessionCookie = cookieStore.get('dev_session');
      if (devSessionCookie) {
        const sessionData = JSON.parse(devSessionCookie.value);
        debugLog('SESSION', 'Using dev session data', {
          hasUser: !!sessionData.user
        });
        return sessionData;
      }
    } catch (e) {
      debugLog('SESSION', 'Dev session parse error', { error: e.message });
    }
    
    return null;
  } catch (error) {
    debugLog('SESSION', 'Unexpected error getting session', {
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}

// Mock data generators for testing
function generateMockData(dataType, count = 10) {
  debugLog('MOCK', `Generating mock data for ${dataType}`, { count });
  
  const mockGenerators = {
    products: () => ({
      id: Math.random().toString(36).substr(2, 9),
      name: `Product ${Math.floor(Math.random() * 1000)}`,
      sku: `SKU-${Math.floor(Math.random() * 10000)}`,
      price: (Math.random() * 100).toFixed(2),
      cost: (Math.random() * 50).toFixed(2),
      quantity: Math.floor(Math.random() * 100),
      category: ['Electronics', 'Clothing', 'Food', 'Books'][Math.floor(Math.random() * 4)],
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    }),
    
    customers: () => ({
      id: Math.random().toString(36).substr(2, 9),
      name: `Customer ${Math.floor(Math.random() * 1000)}`,
      email: `customer${Math.floor(Math.random() * 1000)}@example.com`,
      phone: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      address: `${Math.floor(Math.random() * 999)} Main St`,
      city: ['New York', 'Los Angeles', 'Chicago', 'Houston'][Math.floor(Math.random() * 4)],
      total_purchases: (Math.random() * 5000).toFixed(2),
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    }),
    
    invoices: () => ({
      id: Math.random().toString(36).substr(2, 9),
      invoice_number: `INV-${Math.floor(Math.random() * 100000)}`,
      customer_name: `Customer ${Math.floor(Math.random() * 1000)}`,
      date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      due_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: (Math.random() * 1000).toFixed(2),
      status: ['paid', 'pending', 'overdue'][Math.floor(Math.random() * 3)],
      items: Math.floor(Math.random() * 5) + 1
    }),
    
    employees: () => ({
      id: Math.random().toString(36).substr(2, 9),
      employee_id: `EMP-${Math.floor(Math.random() * 10000)}`,
      name: `Employee ${Math.floor(Math.random() * 1000)}`,
      email: `employee${Math.floor(Math.random() * 1000)}@company.com`,
      department: ['Sales', 'Marketing', 'IT', 'HR', 'Finance'][Math.floor(Math.random() * 5)],
      position: ['Manager', 'Senior', 'Junior', 'Intern'][Math.floor(Math.random() * 4)],
      salary: Math.floor(Math.random() * 50000 + 30000),
      hire_date: new Date(Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }),
    
    vendors: () => ({
      id: Math.random().toString(36).substr(2, 9),
      vendor_id: `VEN-${Math.floor(Math.random() * 10000)}`,
      name: `Vendor ${Math.floor(Math.random() * 1000)}`,
      contact_person: `Contact ${Math.floor(Math.random() * 100)}`,
      email: `vendor${Math.floor(Math.random() * 1000)}@supplier.com`,
      phone: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      total_purchases: (Math.random() * 10000).toFixed(2),
      payment_terms: ['Net 30', 'Net 60', 'Due on receipt'][Math.floor(Math.random() * 3)]
    })
  };
  
  const generator = mockGenerators[dataType] || mockGenerators.products;
  return Array.from({ length: count }, generator);
}

// Apply date range filter
function applyDateFilter(data, dateRange, customDateRange, dateField = 'created_at') {
  debugLog('FILTER', 'Applying date filter', { dateRange, customDateRange, dateField });
  
  if (dateRange === 'all') return data;
  
  const now = new Date();
  let startDate;
  
  switch (dateRange) {
    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'lastMonth':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case 'thisQuarter':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'thisYear':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      if (customDateRange?.start) {
        startDate = new Date(customDateRange.start);
      }
      break;
  }
  
  if (!startDate) return data;
  
  const endDate = dateRange === 'custom' && customDateRange?.end 
    ? new Date(customDateRange.end) 
    : now;
    
  debugLog('FILTER', 'Date range', { 
    startDate: startDate.toISOString(), 
    endDate: endDate.toISOString() 
  });
  
  return data.filter(item => {
    const itemDate = new Date(item[dateField] || item.date || item.created_at || item.hire_date);
    return itemDate >= startDate && itemDate <= endDate;
  });
}

// Export data in different formats
async function exportData(data, format, dataTypes, options = {}) {
  debugLog('EXPORT', 'Starting export', { 
    format, 
    dataTypes, 
    recordCount: Object.keys(data).reduce((acc, key) => acc + (data[key]?.length || 0), 0),
    options 
  });
  
  try {
    switch (format) {
      case 'excel': {
        debugLog('EXPORT', 'Creating Excel workbook');
        const wb = XLSX.utils.book_new();
        
        // Add each data type as a separate sheet
        for (const [dataType, records] of Object.entries(data)) {
          if (records && records.length > 0) {
            debugLog('EXPORT', `Adding sheet for ${dataType}`, { 
              recordCount: records.length 
            });
            
            const ws = XLSX.utils.json_to_sheet(records, {
              header: options.headers !== false ? undefined : 0,
              dateNF: 'yyyy-mm-dd'
            });
            
            // Add formatting if requested
            if (options.formatting) {
              // Auto-size columns
              const maxWidth = 50;
              const cols = [];
              const range = XLSX.utils.decode_range(ws['!ref']);
              
              for (let C = range.s.c; C <= range.e.c; ++C) {
                let max = 10;
                for (let R = range.s.r; R <= range.e.r; ++R) {
                  const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
                  if (cell && cell.v) {
                    const len = cell.v.toString().length;
                    if (len > max) max = len;
                  }
                }
                cols.push({ wch: Math.min(max + 2, maxWidth) });
              }
              ws['!cols'] = cols;
            }
            
            // Clean sheet name (Excel has restrictions)
            const sheetName = dataType.substring(0, 31).replace(/[\\\/\?\*\[\]]/g, '');
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
          }
        }
        
        debugLog('EXPORT', 'Writing Excel file to buffer');
        const excelBuffer = XLSX.write(wb, { 
          type: 'buffer', 
          bookType: 'xlsx',
          compression: true 
        });
        
        return {
          data: excelBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          extension: 'xlsx'
        };
      }
      
      case 'csv': {
        debugLog('EXPORT', 'Creating CSV files');
        // For CSV, we'll combine all data into one file with a type column
        const allRecords = [];
        
        for (const [dataType, records] of Object.entries(data)) {
          if (records && records.length > 0) {
            debugLog('EXPORT', `Processing ${dataType} for CSV`, { 
              recordCount: records.length 
            });
            
            records.forEach(record => {
              allRecords.push({
                _type: dataType,
                ...record
              });
            });
          }
        }
        
        if (allRecords.length === 0) {
          throw new Error('No data to export');
        }
        
        debugLog('EXPORT', 'Converting to CSV', { 
          totalRecords: allRecords.length 
        });
        
        const csv = parse(allRecords, {
          header: options.headers !== false
        });
        
        return {
          data: Buffer.from(csv, 'utf-8'),
          contentType: 'text/csv',
          extension: 'csv'
        };
      }
      
      case 'pdf': {
        debugLog('EXPORT', 'PDF export not yet implemented, falling back to CSV');
        // For now, return CSV for PDF requests
        return exportData(data, 'csv', dataTypes, options);
      }
      
      case 'quickbooks': {
        debugLog('EXPORT', 'QuickBooks export not yet implemented, falling back to CSV');
        // For now, return CSV for QuickBooks requests
        return exportData(data, 'csv', dataTypes, options);
      }
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    debugLog('EXPORT', 'Export error', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

export async function POST(request) {
  debugLog('MAIN', '=== POST /api/import-export/export-data START ===');
  const startTime = Date.now();
  
  try {
    // Step 1: Parse request body
    debugLog('MAIN', 'Step 1: Parsing request body');
    let body;
    try {
      body = await request.json();
      debugLog('MAIN', 'Request body parsed', {
        dataTypes: body.dataTypes,
        format: body.format,
        dateRange: body.dateRange,
        hasCustomDateRange: !!body.customDateRange,
        hasOptions: !!body.options
      });
    } catch (error) {
      debugLog('MAIN', 'Failed to parse request body', { error: error.message });
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    // Step 2: Validate request
    debugLog('MAIN', 'Step 2: Validating request');
    const { dataTypes, format, dateRange, customDateRange, options } = body;
    
    if (!dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
      debugLog('MAIN', 'Invalid data types', { dataTypes });
      return NextResponse.json(
        { error: 'No data types specified for export' },
        { status: 400 }
      );
    }
    
    if (!format) {
      debugLog('MAIN', 'No format specified');
      return NextResponse.json(
        { error: 'Export format not specified' },
        { status: 400 }
      );
    }
    
    // Step 3: Check session (but don't fail if missing for now)
    debugLog('MAIN', 'Step 3: Checking session');
    const session = await getSessionFromCookies();
    
    if (!session) {
      debugLog('MAIN', 'No valid session found - continuing with mock data');
      // For now, we'll continue with mock data even without a session
      // In production, you'd want to return a 401 here
    } else {
      debugLog('MAIN', 'Session found', {
        userEmail: session.user?.email,
        userRole: session.user?.role,
        tenantId: session.user?.tenant_id
      });
    }
    
    // Step 4: Fetch data for each type
    debugLog('MAIN', 'Step 4: Fetching data for export');
    const exportData = {};
    
    for (const dataType of dataTypes) {
      debugLog('MAIN', `Fetching data for ${dataType}`);
      
      try {
        // In a real implementation, you would fetch from the backend API
        // For now, we'll use mock data to test the export functionality
        let data = generateMockData(dataType, 50);
        
        // Apply date filter
        data = applyDateFilter(data, dateRange, customDateRange);
        
        debugLog('MAIN', `Data fetched for ${dataType}`, {
          recordCount: data.length
        });
        
        exportData[dataType] = data;
      } catch (error) {
        debugLog('MAIN', `Error fetching ${dataType}`, {
          error: error.message
        });
        // Continue with other data types
      }
    }
    
    // Check if we have any data to export
    const totalRecords = Object.values(exportData).reduce((sum, data) => sum + (data?.length || 0), 0);
    debugLog('MAIN', 'Total records to export', { totalRecords });
    
    if (totalRecords === 0) {
      return NextResponse.json(
        { error: 'No data found for the specified criteria' },
        { status: 404 }
      );
    }
    
    // Step 5: Generate export file
    debugLog('MAIN', 'Step 5: Generating export file');
    const exportResult = await exportData(exportData, format, dataTypes, options);
    
    // Step 6: Create response
    debugLog('MAIN', 'Step 6: Creating response');
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `dott_export_${dataTypes.join('_')}_${timestamp}.${exportResult.extension}`;
    
    const response = new NextResponse(exportResult.data, {
      status: 200,
      headers: {
        'Content-Type': exportResult.contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': exportResult.data.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Export-Record-Count': totalRecords.toString(),
        'X-Export-Data-Types': dataTypes.join(',')
      }
    });
    
    const totalTime = Date.now() - startTime;
    debugLog('MAIN', `=== Export completed in ${totalTime}ms ===`, {
      filename,
      fileSize: exportResult.data.length,
      format: exportResult.extension,
      totalRecords
    });
    
    return response;
    
  } catch (error) {
    debugLog('MAIN', 'Unexpected error in export', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        error: 'Export failed', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}