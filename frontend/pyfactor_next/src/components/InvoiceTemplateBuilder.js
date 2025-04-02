// InvoiceTemplateBuilder.js
import React from 'react';
import InvoicePreview from './InvoicePreview';

const InvoiceTemplateBuilder = ({
  handleClose,
  userData,
  logo,
  accentColor,
  template,
  invoiceItems,
  handleLogoUpload,
  handleAccentColorChange,
  handleTemplateChange,
  handleAddInvoiceItem,
  handleInvoiceItemChange,
}) => {
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 md:col-span-8">
        <div>
          <h1 className="text-2xl font-semibold mb-2">
            Let's create the perfect template
          </h1>
          <p className="text-gray-600">First impressions make all the difference.</p>

          <div className="mt-8">
            <h2 className="text-lg font-medium mb-2">1. Add a logo</h2>
            <input 
              type="file" 
              onChange={handleLogoUpload}
              className="border border-gray-300 rounded p-2 w-full"
            />
            {logo && (
              <img 
                src={logo} 
                alt="Logo Preview" 
                className="max-w-[200px] mt-2" 
              />
            )}
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-medium mb-2">2. Choose an accent color</h2>
            <input
              type="text"
              value={accentColor}
              onChange={handleAccentColorChange}
              placeholder="Hex"
              className="border border-gray-300 rounded p-2 w-full"
            />
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-medium mb-2">3. Choose a template</h2>
            <select 
              value={template} 
              onChange={handleTemplateChange}
              className="border border-gray-300 rounded p-2 w-full bg-white"
            >
              <option value="Contemporary">Contemporary</option>
              <option value="Modern">Modern</option>
              <option value="Classic">Classic</option>
            </select>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-medium mb-2">4. Add Invoice Items</h2>
            <button 
              className="bg-primary-main hover:bg-primary-dark text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-light transition-colors"
              onClick={handleAddInvoiceItem}
            >
              Add Item
            </button>
            
            {invoiceItems.map((item, index) => (
              <div key={index} className="mt-4 flex flex-col md:flex-row gap-4">
                <input
                  className="border border-gray-300 rounded p-2 flex-grow"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => handleInvoiceItemChange(index, 'description', e.target.value)}
                />
                <input
                  className="border border-gray-300 rounded p-2 w-24"
                  type="number"
                  placeholder="Quantity"
                  value={item.quantity}
                  onChange={(e) =>
                    handleInvoiceItemChange(index, 'quantity', parseFloat(e.target.value))
                  }
                />
                <input
                  className="border border-gray-300 rounded p-2 w-32"
                  type="number"
                  placeholder="Unit Price"
                  value={item.unitPrice}
                  onChange={(e) =>
                    handleInvoiceItemChange(index, 'unitPrice', parseFloat(e.target.value))
                  }
                />
                <div className="flex items-center">
                  <p className="text-gray-700">Amount: {item.amount}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <button 
              className="bg-primary-main hover:bg-primary-dark text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-light transition-colors"
              onClick={handleClose}
            >
              Close Builder
            </button>
          </div>
        </div>
      </div>
      
      <div className="col-span-12 md:col-span-4">
        <InvoicePreview
          logo={logo}
          accentColor={accentColor}
          template={template}
          userData={userData}
          invoiceItems={invoiceItems}
        />
      </div>
    </div>
  );
};

export default InvoiceTemplateBuilder;