import React from 'react';

const InvoicePreview = ({ data, style = 'modern' }) => {
  // Support both new data format and old prop format for backwards compatibility
  const {
    customer,
    items = [],
    logo,
    accentColor = '#000080',
    template,
    subtotal: providedSubtotal,
    tax: providedTax,
    total: providedTotal,
    invoiceNumber = 'INV-001',
    issueDate = new Date().toISOString().split('T')[0],
    dueDate,
  } = data || {};

  // Fallback to old props structure if not using data prop
  const userData = customer || data?.userData || {};
  const invoiceItems = items || data?.invoiceItems || [];
  const products = data?.products || [];
  const services = data?.services || [];

  const { first_name, last_name, business_name, address, city, state, zip_code, phone, email } =
    userData || {};

  // Calculate financials if not provided
  const calculateSubtotal = () => invoiceItems.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
  const subtotal = providedSubtotal !== undefined ? providedSubtotal : calculateSubtotal();
  const tax = providedTax !== undefined ? providedTax : subtotal * 0.1;
  const total = providedTotal !== undefined ? providedTotal : subtotal + tax;

  const getItemName = (item) => {
    if (item.type === 'product') {
      const product = products.find((product) => product.id === item.productId);
      return product ? product.name : item.description || '';
    } else if (item.type === 'service') {
      const service = services.find((service) => service.id === item.serviceId);
      return service ? service.name : item.description || '';
    }
    return item.description || '';
  };

  // Format a date string or use current date
  const formatDate = (dateString) => {
    try {
      return new Date(dateString || Date.now()).toLocaleDateString();
    } catch (e) {
      return new Date().toLocaleDateString();
    }
  };

  // Render the Modern style invoice
  const renderModernInvoice = () => (
    <div className="bg-white rounded-lg overflow-hidden">
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            {logo && (
              <img src={logo} alt="Company Logo" className="h-16 mb-4 object-contain" />
            )}
            <h1 className="text-3xl font-bold" style={{ color: accentColor }}>
              INVOICE
            </h1>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold">#{invoiceNumber}</p>
            <p className="text-gray-500">Issue Date: {formatDate(issueDate)}</p>
            <p className="text-gray-500">Due Date: {formatDate(dueDate)}</p>
          </div>
        </div>
        
        {/* Billing Info */}
        <div className="grid grid-cols-2 gap-12 mb-12">
          <div>
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-2">From</h2>
            <p className="font-semibold">{business_name || 'Your Company Name'}</p>
            <p>{address}</p>
            <p>{city}, {state} {zip_code}</p>
            <p>{phone}</p>
            <p>{email}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-2">Bill To</h2>
            <p className="font-semibold">{`${first_name} ${last_name}`}</p>
            <p>{customer?.address || userData?.address}</p>
            <p>{customer?.city || userData?.city}, {customer?.state || userData?.state} {customer?.zip_code || userData?.zip_code}</p>
            <p>{customer?.phone || userData?.phone}</p>
            <p>{customer?.email || userData?.email}</p>
          </div>
        </div>
        
        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: accentColor }}>
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-right py-3 px-4">Quantity</th>
                <th className="text-right py-3 px-4">Unit Price</th>
                <th className="text-right py-3 px-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoiceItems.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-4 px-4">
                    <p className="font-medium">{getItemName(item)}</p>
                    <p className="text-gray-500">{item.description}</p>
                  </td>
                  <td className="text-right py-4 px-4">{item.quantity}</td>
                  <td className="text-right py-4 px-4">${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                  <td className="text-right py-4 px-4">${parseFloat(item.quantity * item.unitPrice || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Summary */}
        <div className="flex justify-end">
          <div className="w-72">
            <div className="flex justify-between py-2">
              <p>Subtotal</p>
              <p>${parseFloat(subtotal).toFixed(2)}</p>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <p>Tax</p>
              <p>${parseFloat(tax).toFixed(2)}</p>
            </div>
            <div className="flex justify-between py-4 font-bold" style={{ color: accentColor }}>
              <p>Total</p>
              <p>${parseFloat(total).toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
  
  // Render the Classic style invoice
  const renderClassicInvoice = () => (
    <div className="bg-white border border-gray-300 rounded-md overflow-hidden">
      <div className="p-8">
        {/* Header */}
        <div className="text-center mb-6 border-b pb-6">
          {logo && (
            <img src={logo} alt="Company Logo" className="h-16 mx-auto mb-2" />
          )}
          <h1 className="text-2xl font-bold uppercase mb-1">INVOICE</h1>
          <p className="text-sm text-gray-500">Invoice # {invoiceNumber}</p>
        </div>
        
        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border rounded-md p-4">
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Date of Issue</h3>
            <p className="text-sm">{formatDate(issueDate)}</p>
          </div>
          <div className="border rounded-md p-4">
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Due Date</h3>
            <p className="text-sm">{formatDate(dueDate)}</p>
          </div>
        </div>
        
        {/* From/To */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="border rounded-md p-4">
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">From</h3>
            <p className="text-sm font-semibold">{business_name || 'Your Company Name'}</p>
            <p className="text-sm">{address}</p>
            <p className="text-sm">{city}, {state} {zip_code}</p>
            <p className="text-sm">{phone}</p>
            <p className="text-sm">{email}</p>
          </div>
          <div className="border rounded-md p-4">
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Bill To</h3>
            <p className="text-sm font-semibold">{`${first_name} ${last_name}`}</p>
            <p className="text-sm">{customer?.address || userData?.address}</p>
            <p className="text-sm">{customer?.city || userData?.city}, {customer?.state || userData?.state} {customer?.zip_code || userData?.zip_code}</p>
            <p className="text-sm">{customer?.phone || userData?.phone}</p>
            <p className="text-sm">{customer?.email || userData?.email}</p>
          </div>
        </div>
        
        {/* Items Table */}
        <div className="mb-8 border rounded-md overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs font-semibold uppercase py-3 px-4 text-gray-500">Description</th>
                <th className="text-center text-xs font-semibold uppercase py-3 px-4 text-gray-500">Quantity</th>
                <th className="text-right text-xs font-semibold uppercase py-3 px-4 text-gray-500">Unit Price</th>
                <th className="text-right text-xs font-semibold uppercase py-3 px-4 text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoiceItems.map((item, index) => (
                <tr key={index} className="border-t border-gray-200">
                  <td className="py-4 px-4">
                    <p className="text-sm font-medium">{getItemName(item)}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </td>
                  <td className="text-center py-4 px-4 text-sm">{item.quantity}</td>
                  <td className="text-right py-4 px-4 text-sm">${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                  <td className="text-right py-4 px-4 text-sm">${parseFloat(item.quantity * item.unitPrice || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-64 border rounded-md overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <p className="text-sm font-semibold">Invoice Summary</p>
            </div>
            <div className="p-4">
              <div className="flex justify-between py-2 text-sm">
                <p>Subtotal:</p>
                <p>${parseFloat(subtotal).toFixed(2)}</p>
              </div>
              <div className="flex justify-between py-2 text-sm">
                <p>Tax:</p>
                <p>${parseFloat(tax).toFixed(2)}</p>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold border-t mt-2 pt-3">
                <p>Total:</p>
                <p>${parseFloat(total).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Payment Terms */}
        <div className="border rounded-md p-4 mb-8">
          <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Payment Terms</h3>
          <p className="text-sm">Payment is due within 30 days.</p>
        </div>
        
        {/* Footer */}
        <div className="text-center text-gray-500 text-xs mt-8">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </div>
  );

  return style === 'modern' ? renderModernInvoice() : renderClassicInvoice();
};

export default InvoicePreview;
