import React from 'react';

const InvoicePreview = ({
  logo,
  accentColor,
  template,
  userData,
  invoiceItems,
  products,
  services,
}) => {
  const { first_name, last_name, business_name, address, city, state, zip_code, phone, email } =
    userData || {};
  const subtotal = invoiceItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const getItemName = (item) => {
    if (item.type === 'product') {
      const product = products.find((product) => product.id === item.productId);
      return product ? product.name : '';
    } else if (item.type === 'service') {
      const service = services.find((service) => service.id === item.serviceId);
      return service ? service.name : '';
    }
    return '';
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex flex-col items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold" style={{ color: accentColor }}>
          INVOICE
        </h1>
        <p className="text-base">Invoice # for your recent order</p>
      </div>
      
      <div className="grid gap-1 text-center mb-4">
        <p className="text-sm">{business_name}</p>
        <p className="text-sm">{email}</p>
        <p className="text-sm">{business_name}.com</p>
      </div>
      
      <div className="border-t border-b py-4 px-6 grid gap-2 text-left mb-4">
        <div className="flex justify-between">
          <p className="text-sm font-semibold">Invoice number</p>
          <p className="text-sm text-gray-600">#123456</p>
        </div>
        <div className="flex justify-between">
          <p className="text-sm font-semibold">Issue date</p>
          <p className="text-sm">{new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex justify-between">
          <p className="text-sm font-semibold">Due date</p>
          <p className="text-sm">
            {new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString()}
          </p>
        </div>
      </div>
      
      <div className="border-t py-4 px-6 grid gap-2 text-left mb-4">
        <p className="text-sm font-semibold">Bill to</p>
        <div className="grid gap-1">
          <p className="text-sm">{`${first_name} ${last_name}`}</p>
          <p className="text-sm">{business_name}</p>
          <p className="text-sm">{`${address}, ${city}, ${state} ${zip_code}`}</p>
          <p className="text-sm">{`Phone: ${phone}`}</p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoiceItems.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getItemName(item)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.unitPrice?.toFixed(2) || '0.00'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(item.quantity * item.unitPrice || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="border-t border-b py-4 px-6 grid gap-2 text-right mt-4">
        <div className="flex justify-between">
          <p className="text-sm">Subtotal</p>
          <p className="text-sm">${subtotal.toFixed(2)}</p>
        </div>
        <div className="flex justify-between">
          <p className="text-sm">Tax (10%)</p>
          <p className="text-sm">${tax.toFixed(2)}</p>
        </div>
        <div className="flex justify-between">
          <p className="text-sm font-semibold">Total</p>
          <p className="text-sm font-semibold">${total.toFixed(2)}</p>
        </div>
      </div>
      
      <div className="flex justify-end mt-4">
        <button className="mr-2 px-4 py-2 border border-blue-500 text-blue-500 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
          Edit
        </button>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
          Download
        </button>
      </div>
    </div>
  );
};

export default InvoicePreview;
