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
          userRole: sessionData.user?.role,
          tenantId: sessionData.user?.tenant_id
        });
        return sessionData;
      }
    } catch (error) {
      debugLog('SESSION', 'Backend validation error', {
        error: error.message
      });
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

// Fetch real data from backend API
async function fetchRealData(dataType, session, dateRange, customDateRange) {
  debugLog('FETCH', `Fetching real data for ${dataType}`, { 
    hasSession: !!session,
    tenantId: session?.user?.tenant_id,
    dateRange 
  });
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
  const cookieStore = cookies();
  const sidCookie = cookieStore.get('sid');
  const sessionId = sidCookie?.value || session?.sid;
  
  // Map data types to API endpoints
  const endpointMap = {
    'products': '/api/products/',
    'customers': '/api/crm/customers/',
    'invoices': '/api/invoices/',
    'bills': '/api/bills/',
    'chart-of-accounts': '/api/accounting/accounts/',
    'tax-rates': '/api/taxes/rates/',
    'vendors': '/api/purchases/vendors/',
    'employees': '/api/hr/employees/'
  };
  
  const endpoint = endpointMap[dataType];
  if (!endpoint) {
    debugLog('FETCH', `No endpoint mapping for data type: ${dataType}`);
    return [];
  }
  
  try {
    // Build query parameters
    const params = new URLSearchParams();
    
    // Add date range filtering
    if (dateRange && dateRange !== 'all') {
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
      
      if (startDate) {
        params.append('created_at__gte', startDate.toISOString());
        
        if (dateRange === 'custom' && customDateRange?.end) {
          params.append('created_at__lte', new Date(customDateRange.end).toISOString());
        }
      }
    }
    
    // Build the full URL
    const url = `${API_URL}${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
    debugLog('FETCH', `Calling backend API: ${url}`);
    
    // Make the API call with session cookie
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cookie': `sid=${sessionId}`,
        'X-Tenant-ID': session?.user?.tenant_id || ''
      },
      credentials: 'include'
    });
    
    debugLog('FETCH', `Backend response for ${dataType}`, {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type')
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      debugLog('FETCH', `Error fetching ${dataType}`, {
        status: response.status,
        error: errorText.substring(0, 200)
      });
      return [];
    }
    
    const data = await response.json();
    debugLog('FETCH', `Data received for ${dataType}`, {
      isArray: Array.isArray(data),
      count: Array.isArray(data) ? data.length : data.results?.length || data.count || 0,
      hasResults: !!data.results,
      hasData: !!data.data
    });
    
    // Handle different response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data.results && Array.isArray(data.results)) {
      return data.results;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else {
      debugLog('FETCH', `Unexpected data format for ${dataType}`, {
        keys: Object.keys(data)
      });
      return [];
    }
    
  } catch (error) {
    debugLog('FETCH', `Error fetching ${dataType}`, {
      error: error.message,
      stack: error.stack
    });
    return [];
  }
}

// Format data for export (clean up backend fields)
function formatDataForExport(data, dataType) {
  debugLog('FORMAT', `Formatting ${data.length} records for ${dataType}`);
  
  // Define field mappings for each data type
  const fieldMappings = {
    products: (item) => ({
      'Product ID': item.id || item.product_id || '',
      'Name': item.name || item.product_name || '',
      'SKU': item.sku || item.product_sku || '',
      'Category': item.category || item.product_category || '',
      'Price': item.price || item.selling_price || 0,
      'Cost': item.cost || item.purchase_price || 0,
      'Stock': item.quantity || item.stock_quantity || 0,
      'Status': item.is_active ? 'Active' : 'Inactive',
      'Created Date': item.created_at ? new Date(item.created_at).toLocaleDateString() : '',
      'Modified Date': item.updated_at ? new Date(item.updated_at).toLocaleDateString() : ''
    }),
    
    customers: (item) => ({
      'Customer ID': item.id || item.customer_id || '',
      'Name': item.name || item.customer_name || item.full_name || '',
      'Email': item.email || item.customer_email || '',
      'Phone': item.phone || item.phone_number || '',
      'Company': item.company || item.company_name || '',
      'Address': item.address || item.street_address || '',
      'City': item.city || '',
      'State': item.state || item.province || '',
      'Country': item.country || '',
      'Total Purchases': item.total_purchases || item.lifetime_value || 0,
      'Status': item.is_active ? 'Active' : 'Inactive',
      'Created Date': item.created_at ? new Date(item.created_at).toLocaleDateString() : ''
    }),
    
    invoices: (item) => ({
      'Invoice Number': item.invoice_number || item.number || '',
      'Date': item.date || item.invoice_date ? new Date(item.date || item.invoice_date).toLocaleDateString() : '',
      'Due Date': item.due_date ? new Date(item.due_date).toLocaleDateString() : '',
      'Customer': item.customer_name || item.customer?.name || '',
      'Subtotal': item.subtotal || 0,
      'Tax': item.tax_amount || item.tax || 0,
      'Total': item.total || item.amount || 0,
      'Status': item.status || 'pending',
      'Payment Status': item.payment_status || (item.is_paid ? 'paid' : 'unpaid'),
      'Created Date': item.created_at ? new Date(item.created_at).toLocaleDateString() : ''
    }),
    
    employees: (item) => ({
      'Employee ID': item.employee_id || item.id || '',
      'First Name': item.first_name || '',
      'Last Name': item.last_name || '',
      'Full Name': item.full_name || `${item.first_name || ''} ${item.last_name || ''}`.trim(),
      'Email': item.email || item.work_email || '',
      'Phone': item.phone || item.phone_number || '',
      'Department': item.department || '',
      'Position': item.position || item.job_title || '',
      'Hire Date': item.hire_date ? new Date(item.hire_date).toLocaleDateString() : '',
      'Status': item.is_active ? 'Active' : 'Inactive',
      'Pay Rate': item.pay_rate || item.hourly_rate || item.salary || 0,
      'Pay Type': item.pay_type || (item.hourly_rate ? 'Hourly' : 'Salary')
    }),
    
    vendors: (item) => ({
      'Vendor ID': item.id || item.vendor_id || '',
      'Company Name': item.company_name || item.name || '',
      'Contact Person': item.contact_person || item.contact_name || '',
      'Email': item.email || item.contact_email || '',
      'Phone': item.phone || item.phone_number || '',
      'Address': item.address || item.street_address || '',
      'City': item.city || '',
      'State': item.state || item.province || '',
      'Country': item.country || '',
      'Payment Terms': item.payment_terms || '',
      'Tax ID': item.tax_id || item.ein || '',
      'Status': item.is_active ? 'Active' : 'Inactive',
      'Created Date': item.created_at ? new Date(item.created_at).toLocaleDateString() : ''
    }),
    
    bills: (item) => ({
      'Bill Number': item.bill_number || item.number || '',
      'Date': item.bill_date || item.date ? new Date(item.bill_date || item.date).toLocaleDateString() : '',
      'Due Date': item.due_date ? new Date(item.due_date).toLocaleDateString() : '',
      'Vendor': item.vendor_name || item.vendor?.name || '',
      'Description': item.description || '',
      'Amount': item.amount || item.total || 0,
      'Tax': item.tax_amount || 0,
      'Total': item.total_amount || item.total || 0,
      'Status': item.status || 'pending',
      'Payment Status': item.payment_status || (item.is_paid ? 'paid' : 'unpaid'),
      'Created Date': item.created_at ? new Date(item.created_at).toLocaleDateString() : ''
    }),
    
    'tax-rates': (item) => ({
      'Tax Rate ID': item.id || '',
      'Name': item.name || item.tax_name || '',
      'Rate': item.rate || item.tax_rate || 0,
      'Type': item.tax_type || 'sales',
      'Country': item.country || '',
      'State': item.state || item.province || '',
      'Description': item.description || '',
      'Status': item.is_active ? 'Active' : 'Inactive',
      'Created Date': item.created_at ? new Date(item.created_at).toLocaleDateString() : ''
    }),
    
    'chart-of-accounts': (item) => ({
      'Account Code': item.code || item.account_code || '',
      'Account Name': item.name || item.account_name || '',
      'Account Type': item.account_type || item.type || '',
      'Category': item.category || '',
      'Balance': item.balance || item.current_balance || 0,
      'Currency': item.currency || 'USD',
      'Description': item.description || '',
      'Status': item.is_active ? 'Active' : 'Inactive',
      'Created Date': item.created_at ? new Date(item.created_at).toLocaleDateString() : ''
    })
  };
  
  const formatter = fieldMappings[dataType] || ((item) => item);
  return data.map(formatter);
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
                '_Data Type': dataType,
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
    
    // Step 3: Check session
    debugLog('MAIN', 'Step 3: Checking session');
    const session = await getSessionFromCookies();
    
    if (!session) {
      debugLog('MAIN', 'No valid session found');
      return NextResponse.json(
        { error: 'Authentication required. Please sign in and try again.' },
        { status: 401 }
      );
    }
    
    debugLog('MAIN', 'Session found', {
      userEmail: session.user?.email,
      userRole: session.user?.role,
      tenantId: session.user?.tenant_id
    });
    
    // Step 4: Fetch real data for each type
    debugLog('MAIN', 'Step 4: Fetching real data for export');
    const exportData = {};
    
    for (const dataType of dataTypes) {
      debugLog('MAIN', `Fetching data for ${dataType}`);
      
      try {
        // Fetch real data from backend
        const rawData = await fetchRealData(dataType, session, dateRange, customDateRange);
        
        // Format data for export
        const formattedData = formatDataForExport(rawData, dataType);
        
        debugLog('MAIN', `Data fetched and formatted for ${dataType}`, {
          rawCount: rawData.length,
          formattedCount: formattedData.length
        });
        
        if (formattedData.length > 0) {
          exportData[dataType] = formattedData;
        }
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
        { error: 'No data found for the specified criteria. Please ensure you have data in the selected categories.' },
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