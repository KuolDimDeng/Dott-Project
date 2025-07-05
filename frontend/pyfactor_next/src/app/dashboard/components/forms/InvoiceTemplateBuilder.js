// InvoiceTemplateBuilder.js
import React, { useState } from 'react';
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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      <div className="md:col-span-8">
        <div>
          <h4 className="text-2xl font-semibold mb-2">
            Let's create the perfect template
          </h4>
          <p className="text-gray-700">First impressions make all the difference.</p>

          <div className="mt-8">
            <h6 className="text-lg font-medium mb-2">1. Add a logo</h6>
            <input 
              type="file" 
              onChange={handleLogoUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {logo && <img src={logo} alt="Logo Preview" className="max-w-[200px] mt-2" />}
          </div>

          <div className="mt-8">
            <h6 className="text-lg font-medium mb-2">2. Choose an accent color</h6>
            <input
              type="text"
              value={accentColor}
              onChange={handleAccentColorChange}
              placeholder="Hex"
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mt-8">
            <h6 className="text-lg font-medium mb-2">3. Choose a template</h6>
            <select 
              value={template} 
              onChange={handleTemplateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Contemporary">Contemporary</option>
              <option value="Modern">Modern</option>
              <option value="Classic">Classic</option>
            </select>
          </div>

          <div className="mt-8">
            <h6 className="text-lg font-medium mb-2">4. Add Invoice Items</h6>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={handleAddInvoiceItem}
            >
              Add Item
            </button>
            {invoiceItems.map((item, index) => (
              <div key={index} className="mt-4 flex flex-wrap gap-4 items-center">
                <input
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => handleInvoiceItemChange(index, 'description', e.target.value)}
                />
                <input
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                  type="number"
                  placeholder="Quantity"
                  value={item.quantity}
                  onChange={(e) =>
                    handleInvoiceItemChange(index, 'quantity', parseFloat(e.target.value))
                  }
                />
                <input
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                  type="number"
                  placeholder="Unit Price"
                  value={item.unitPrice}
                  onChange={(e) =>
                    handleInvoiceItemChange(index, 'unitPrice', parseFloat(e.target.value))
                  }
                />
                <p className="text-gray-700">Amount: {item.amount}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={handleClose}
            >
              Close Builder
            </button>
          </div>
        </div>
      </div>
      <div className="md:col-span-4">
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