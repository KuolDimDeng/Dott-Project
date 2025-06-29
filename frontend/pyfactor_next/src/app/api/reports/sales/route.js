import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { fetchWithAuth } from '@/utils/api';

// GET /api/reports/sales
export async function GET(request) {
  try {
    logger.info('[API] GET /api/reports/sales');
    
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('report_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    logger.info('[API] Report parameters:', { reportType, startDate, endDate });
    
    // Forward request to Django backend
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/reports/sales/?report_type=${reportType}&start_date=${startDate}&end_date=${endDate}`;
    
    try {
      const response = await fetchWithAuth(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cookies: request.cookies,
      });

      const data = await response.json();
      logger.info('[API] Sales report generated successfully');
      
      return NextResponse.json(data);
    } catch (backendError) {
      logger.error('[API] Backend error:', backendError);
      
      // If backend doesn't have the endpoint, generate report from existing data
      if (backendError.status === 404) {
        logger.info('[API] Generating report from local data');
        
        // Fetch data from existing endpoints
        const [ordersRes, invoicesRes, customersRes, productsRes, servicesRes] = await Promise.allSettled([
          fetchWithAuth(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sales/orders/`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cookies: request.cookies,
          }).then(r => r.json()),
          fetchWithAuth(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sales/invoices/`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cookies: request.cookies,
          }).then(r => r.json()),
          fetchWithAuth(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/crm/customers/`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cookies: request.cookies,
          }).then(r => r.json()),
          fetchWithAuth(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/products/`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cookies: request.cookies,
          }).then(r => r.json()),
          fetchWithAuth(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/services/`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cookies: request.cookies,
          }).then(r => r.json())
        ]);
        
        // Process data based on report type
        let reportData = {};
        const orders = ordersRes.status === 'fulfilled' ? (ordersRes.value.results || ordersRes.value || []) : [];
        const invoices = invoicesRes.status === 'fulfilled' ? (invoicesRes.value.results || invoicesRes.value || []) : [];
        const customers = customersRes.status === 'fulfilled' ? (customersRes.value.results || customersRes.value || []) : [];
        const products = productsRes.status === 'fulfilled' ? (productsRes.value.results || productsRes.value || []) : [];
        const services = servicesRes.status === 'fulfilled' ? (servicesRes.value.results || servicesRes.value || []) : [];
        
        // Filter by date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        const filteredOrders = orders.filter(o => {
          const orderDate = new Date(o.order_date || o.created_at);
          return orderDate >= start && orderDate <= end;
        });
        const filteredInvoices = invoices.filter(i => {
          const invoiceDate = new Date(i.invoice_date || i.created_at);
          return invoiceDate >= start && invoiceDate <= end;
        });
        
        switch (reportType) {
          case 'sales_summary':
            reportData = {
              total_sales: filteredOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0),
              total_orders: filteredOrders.length,
              total_customers: [...new Set(filteredOrders.map(o => o.customer_id))].length,
              average_order_value: filteredOrders.length > 0 
                ? filteredOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0) / filteredOrders.length 
                : 0,
              paid_invoices: filteredInvoices.filter(i => i.is_paid || i.status === 'paid').length,
              unpaid_invoices: filteredInvoices.filter(i => !i.is_paid && i.status !== 'paid').length
            };
            break;
            
          case 'sales_by_customer':
            const customerSales = {};
            filteredOrders.forEach(order => {
              const customerId = order.customer_id;
              if (!customerSales[customerId]) {
                const customer = customers.find(c => c.id === customerId);
                customerSales[customerId] = {
                  customer_name: order.customer_name || customer?.name || 'Unknown',
                  total_sales: 0,
                  order_count: 0
                };
              }
              customerSales[customerId].total_sales += parseFloat(order.total_amount || 0);
              customerSales[customerId].order_count += 1;
            });
            reportData = Object.values(customerSales).sort((a, b) => b.total_sales - a.total_sales);
            break;
            
          case 'sales_by_product':
            const productSales = {};
            filteredOrders.forEach(order => {
              if (order.items) {
                order.items.forEach(item => {
                  if (item.product_id) {
                    if (!productSales[item.product_id]) {
                      const product = products.find(p => p.id === item.product_id);
                      productSales[item.product_id] = {
                        product_name: item.product_name || product?.name || 'Unknown',
                        total_sales: 0,
                        quantity_sold: 0
                      };
                    }
                    productSales[item.product_id].total_sales += parseFloat(item.subtotal || 0);
                    productSales[item.product_id].quantity_sold += item.quantity || 0;
                  }
                });
              }
            });
            reportData = Object.values(productSales).sort((a, b) => b.total_sales - a.total_sales);
            break;
            
          case 'sales_by_service':
            const serviceSales = {};
            filteredOrders.forEach(order => {
              if (order.items) {
                order.items.forEach(item => {
                  if (item.service_id) {
                    if (!serviceSales[item.service_id]) {
                      const service = services.find(s => s.id === item.service_id);
                      serviceSales[item.service_id] = {
                        service_name: item.service_name || service?.name || 'Unknown',
                        total_sales: 0,
                        hours_billed: 0
                      };
                    }
                    serviceSales[item.service_id].total_sales += parseFloat(item.subtotal || 0);
                    serviceSales[item.service_id].hours_billed += item.quantity || 0;
                  }
                });
              }
            });
            reportData = Object.values(serviceSales).sort((a, b) => b.total_sales - a.total_sales);
            break;
            
          default:
            reportData = { message: 'Report type not implemented' };
        }
        
        return NextResponse.json({
          report_type: reportType,
          date_range: { start_date: startDate, end_date: endDate },
          data: reportData,
          generated_at: new Date().toISOString()
        });
      }
      
      throw backendError;
    }
  } catch (error) {
    logger.error('[API] Error generating sales report:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate sales report' },
      { status: error.status || 500 }
    );
  }
}