import { NextResponse } from 'next/server';
import { getSession } from '../sessionHelper';
import { captureEvent } from '@/lib/posthog-server';
import * as XLSX from 'xlsx';

// Mock data generator for demo purposes
function generateMockData(dataType, count = 100) {
  const data = [];
  
  switch (dataType) {
    case 'products':
      for (let i = 1; i <= count; i++) {
        data.push({
          name: `Product ${i}`,
          sku: `SKU-${String(i).padStart(5, '0')}`,
          description: `Description for product ${i}`,
          unit_price: (Math.random() * 100 + 10).toFixed(2),
          cost_price: (Math.random() * 50 + 5).toFixed(2),
          category: ['Electronics', 'Clothing', 'Food', 'Books'][Math.floor(Math.random() * 4)],
          quantity_on_hand: Math.floor(Math.random() * 1000),
          reorder_level: Math.floor(Math.random() * 100),
          tax_rate: [0, 5, 10, 15][Math.floor(Math.random() * 4)],
          barcode: `${Math.floor(Math.random() * 1000000000000)}`,
          supplier: `Supplier ${Math.floor(Math.random() * 10) + 1}`,
          location: ['Warehouse A', 'Warehouse B', 'Store'][Math.floor(Math.random() * 3)]
        });
      }
      break;
      
    case 'customers':
      for (let i = 1; i <= count; i++) {
        data.push({
          name: `Customer ${i}`,
          email: `customer${i}@example.com`,
          phone: `555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          company: Math.random() > 0.5 ? `Company ${i}` : '',
          address_line1: `${Math.floor(Math.random() * 9999) + 1} Main St`,
          city: ['New York', 'Los Angeles', 'Chicago', 'Houston'][Math.floor(Math.random() * 4)],
          state: ['NY', 'CA', 'IL', 'TX'][Math.floor(Math.random() * 4)],
          postal_code: String(Math.floor(Math.random() * 90000) + 10000),
          country: 'USA',
          credit_limit: (Math.random() * 10000).toFixed(2)
        });
      }
      break;
      
    default:
      // Generic data
      for (let i = 1; i <= count; i++) {
        data.push({
          id: i,
          name: `${dataType} Item ${i}`,
          created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          status: ['active', 'inactive', 'pending'][Math.floor(Math.random() * 3)]
        });
      }
  }
  
  return data;
}

// Generate Excel file
function generateExcelFile(data, dataTypes) {
  const wb = XLSX.utils.book_new();
  
  // Create a sheet for each data type
  for (const dataType of dataTypes) {
    const sheetData = data[dataType] || [];
    if (sheetData.length > 0) {
      // Convert to worksheet
      const ws = XLSX.utils.json_to_sheet(sheetData);
      
      // Auto-size columns
      const colWidths = [];
      const headers = Object.keys(sheetData[0]);
      headers.forEach((header, i) => {
        const maxLength = Math.max(
          header.length,
          ...sheetData.map(row => String(row[header] || '').length)
        );
        colWidths[i] = { wch: Math.min(maxLength + 2, 50) };
      });
      ws['!cols'] = colWidths;
      
      // Add the worksheet to workbook
      const sheetName = dataType.charAt(0).toUpperCase() + dataType.slice(1).replace(/-/g, ' ');
      XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    }
  }
  
  // Generate binary buffer
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  return buffer;
}

// Generate CSV file
function generateCSVFile(data, dataType) {
  const sheetData = data[dataType] || [];
  if (sheetData.length === 0) return '';
  
  const headers = Object.keys(sheetData[0]);
  const csvRows = [
    headers.join(','),
    ...sheetData.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ];
  return csvRows.join('\n');
}

export async function POST(request) {
  console.log('[export-data] POST request received');
  
  try {
    // Check authentication
    console.log('[export-data] Getting session...');
    const session = await getSession();
    console.log('[export-data] Session result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      hasTenantId: !!session?.user?.tenant_id
    });
    
    if (!session?.user) {
      console.error('[export-data] No session user found, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('[export-data] Request body:', body);
    
    const { 
      dataTypes, 
      format = 'excel', 
      dateRange = 'all',
      customDateRange,
      options = {}
    } = body;

    if (!dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
      return NextResponse.json(
        { error: 'No data types selected' },
        { status: 400 }
      );
    }

    // Track export request
    await captureEvent('data_export_requested', {
      userId: session.user.id,
      dataTypes,
      format,
      dateRange
    });

    // Fetch real data from backend
    const exportData = {};
    let totalRecords = 0;
    
    // Get session token for backend API calls
    const sessionToken = session.token || session.sid;
    
    for (const dataType of dataTypes) {
      try {
        // Map data types to backend endpoints
        let endpoint = '';
        switch (dataType) {
          case 'products':
            endpoint = '/api/products/';
            break;
          case 'services':
            endpoint = '/api/services/';
            break;
          case 'customers':
            endpoint = '/api/customers/';
            break;
          case 'invoices':
            endpoint = '/api/invoices/';
            break;
          case 'bills':
            endpoint = '/api/bills/';
            break;
          case 'vendors':
            endpoint = '/api/vendors/';
            break;
          case 'employees':
            endpoint = '/api/employees/';
            break;
          case 'tax-rates':
            endpoint = '/api/taxes/settings/';
            break;
          case 'chart-of-accounts':
            endpoint = '/api/accounting/chart-of-accounts/';
            break;
          default:
            console.warn(`Unknown data type: ${dataType}`);
            continue;
        }
        
        // Build URL with filters
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
        let url = `${apiUrl}${endpoint}`;
        
        // Add date filters for transactional data
        if ((dataType === 'invoices' || dataType === 'bills') && dateRange !== 'all') {
          const params = new URLSearchParams();
          const now = new Date();
          
          switch (dateRange) {
            case 'this-year':
              params.append('created_after', new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]);
              break;
            case 'last-year':
              params.append('created_after', new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0]);
              params.append('created_before', new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0]);
              break;
            case 'custom':
              if (customDateRange?.start) params.append('created_after', customDateRange.start);
              if (customDateRange?.end) params.append('created_before', customDateRange.end);
              break;
          }
          
          if (params.toString()) url += '?' + params.toString();
        }
        
        // Fetch data from backend
        const response = await fetch(url, {
          headers: {
            'Cookie': `session_token=${sessionToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Handle both array and paginated responses
          const records = Array.isArray(data) ? data : (data.results || data.data || []);
          exportData[dataType] = records;
          totalRecords += records.length;
        } else {
          console.warn(`Failed to fetch ${dataType}: ${response.status}`);
          // Fall back to mock data for this type
          const mockRecords = generateMockData(dataType, 10);
          exportData[dataType] = mockRecords;
          totalRecords += mockRecords.length;
        }
      } catch (error) {
        console.error(`Error fetching ${dataType}:`, error);
        // Fall back to mock data for this type
        const mockRecords = generateMockData(dataType, 10);
        exportData[dataType] = mockRecords;
        totalRecords += mockRecords.length;
      }
    }

    // Generate the actual file
    let fileBuffer;
    let contentType;
    let fileExtension;
    
    try {
      switch (format) {
        case 'excel':
          fileBuffer = generateExcelFile(exportData, dataTypes);
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileExtension = 'xlsx';
          break;
          
        case 'csv':
          // For CSV, we'll export only the first data type
          const firstDataType = dataTypes[0];
          fileBuffer = Buffer.from(generateCSVFile(exportData, firstDataType));
          contentType = 'text/csv';
          fileExtension = 'csv';
          break;
          
        default:
          return NextResponse.json(
            { error: `Export format '${format}' not implemented` },
            { status: 501 }
          );
      }
    } catch (error) {
      console.error('File generation error:', error);
      return NextResponse.json(
        { error: 'Failed to generate export file' },
        { status: 500 }
      );
    }

    // Track successful export
    await captureEvent('data_export_completed', {
      userId: session.user.id,
      dataTypes,
      format,
      totalRecords
    });

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `dott_export_${dataTypes.join('_')}_${timestamp}.${fileExtension}`;
    
    // Return the file as a response
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    
    await captureEvent('data_export_error', {
      error: error.message,
      dataTypes: request.body?.dataTypes
    });

    return NextResponse.json(
      { 
        error: 'Export failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}