import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get session cookie
    const cookies = request.cookies;
    const sessionId = cookies.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Try to get dashboard metrics from Django backend
    const metricsResponse = await fetch(`${process.env.BACKEND_API_URL || 'https://api.dottapps.com'}/api/dashboard/metrics/`, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sessionId.value}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (metricsResponse.ok) {
      const data = await metricsResponse.json();
      return NextResponse.json(data);
    }
    
    // If backend doesn't have this endpoint, fetch data from individual endpoints
    const [invoicesRes, salesRes] = await Promise.all([
      fetch(`${process.env.BACKEND_API_URL || 'https://api.dottapps.com'}/api/sales/invoices/`, {
        method: 'GET',
        headers: {
          'Cookie': `sid=${sessionId.value}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch(`${process.env.BACKEND_API_URL || 'https://api.dottapps.com'}/api/sales/orders/`, {
        method: 'GET',
        headers: {
          'Cookie': `sid=${sessionId.value}`,
          'Content-Type': 'application/json',
        },
      })
    ]);
    
    let invoices = [];
    let sales = [];
    
    if (invoicesRes.ok) {
      const invoicesData = await invoicesRes.json();
      invoices = Array.isArray(invoicesData) ? invoicesData : (invoicesData.results || invoicesData.invoices || []);
    }
    
    if (salesRes.ok) {
      const salesData = await salesRes.json();
      sales = Array.isArray(salesData) ? salesData : (salesData.results || salesData.orders || []);
    }
    
    // Calculate metrics from the data
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Process invoices - ensure invoices is an array
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    const paidInvoices = safeInvoices.filter(i => i && (i.status === 'paid' || i.payment_status === 'paid'));
    const unpaidInvoices = safeInvoices.filter(i => i && (i.status === 'unpaid' || i.status === 'sent' || i.payment_status === 'unpaid'));
    const overdueInvoices = safeInvoices.filter(i => {
      if (!i || i.status === 'paid' || i.payment_status === 'paid') return false;
      const dueDate = new Date(i.due_date || i.date);
      return dueDate < now;
    });
    const draftInvoices = safeInvoices.filter(i => i && i.status === 'draft');
    
    // Calculate sales metrics
    const calculateSalesForPeriod = (startDate) => {
      return safeInvoices
        .filter(i => {
          if (!i) return false;
          const invoiceDate = new Date(i.date || i.created_at);
          return invoiceDate >= startDate && (i.status === 'paid' || i.payment_status === 'paid');
        })
        .reduce((sum, i) => sum + parseFloat(i.total || i.amount || 0), 0);
    };
    
    const metrics = {
      sales: {
        today: calculateSalesForPeriod(startOfDay),
        thisWeek: calculateSalesForPeriod(startOfWeek),
        thisMonth: calculateSalesForPeriod(startOfMonth),
        total: paidInvoices.reduce((sum, i) => sum + parseFloat(i.total || i.amount || 0), 0)
      },
      invoices: {
        total: invoices.length,
        paid: paidInvoices.length,
        unpaid: unpaidInvoices.length,
        overdue: overdueInvoices.length,
        draft: draftInvoices.length
      },
      expenses: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        total: 0
      },
      customers: {
        total: 0,
        new: 0,
        active: 0
      },
      recentActivity: []
    };
    
    return NextResponse.json({ metrics });
    
  } catch (error) {
    console.error('[Dashboard Metrics] Error:', error);
    
    // Return default metrics structure on error
    return NextResponse.json({
      metrics: {
        sales: { today: 0, thisWeek: 0, thisMonth: 0, total: 0 },
        invoices: { total: 0, paid: 0, unpaid: 0, overdue: 0, draft: 0 },
        expenses: { today: 0, thisWeek: 0, thisMonth: 0, total: 0 },
        customers: { total: 0, new: 0, active: 0 },
        recentActivity: []
      }
    }, { status: 200 });
  }
}