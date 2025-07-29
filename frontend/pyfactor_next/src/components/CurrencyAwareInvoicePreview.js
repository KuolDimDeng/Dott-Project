import React, { useState, useEffect } from 'react';
import { formatCurrencyWithPreferences } from '@/utils/currencyFormatter';

const CurrencyAwareInvoicePreview = ({ data, style = 'modern' }) => {
  const [currencyPreferences, setCurrencyPreferences] = useState(null);
  const [exchangeRates, setExchangeRates] = useState({});
  const [loading, setLoading] = useState(true);

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

  // Load currency preferences
  useEffect(() => {
    loadCurrencyPreferences();
  }, []);

  // Load exchange rates when currency preferences change
  useEffect(() => {
    if (currencyPreferences && currencyPreferences.currency_code !== 'USD') {
      loadExchangeRates();
    }
  }, [currencyPreferences]);

  const loadCurrencyPreferences = async () => {
    try {
      const response = await fetch('/api/currency/preferences');
      const data = await response.json();
      
      if (data.success) {
        setCurrencyPreferences(data.preferences);
      } else {
        // Default to USD
        setCurrencyPreferences({
          currency_code: 'USD',
          currency_name: 'US Dollar',
          show_usd_on_invoices: false,
          show_usd_on_quotes: false,
          show_usd_on_reports: false,
        });
      }
    } catch (error) {
      console.error('Error loading currency preferences:', error);
      // Default to USD
      setCurrencyPreferences({
        currency_code: 'USD',
        currency_name: 'US Dollar',
        show_usd_on_invoices: false,
        show_usd_on_quotes: false,
        show_usd_on_reports: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExchangeRates = async () => {
    try {
      // Get exchange rate for each amount we need to display
      const amounts = [
        ...invoiceItems.map(item => item.quantity * item.unitPrice),
        calculateSubtotal(),
        providedTax !== undefined ? providedTax : calculateSubtotal() * 0.1,
        providedTotal !== undefined ? providedTotal : calculateSubtotal() + (providedTax !== undefined ? providedTax : calculateSubtotal() * 0.1)
      ];

      const rates = {};
      
      for (const amount of amounts) {
        if (amount > 0) {
          const response = await fetch('/api/currency/exchange-rate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from_currency: 'USD',
              to_currency: currencyPreferences.currency_code,
              amount: amount,
            }),
          });

          const data = await response.json();
          if (data.success) {
            rates[amount] = {
              converted_amount: parseFloat(data.exchange_rate.converted_amount),
              rate: parseFloat(data.exchange_rate.rate),
            };
          }
        }
      }

      setExchangeRates(rates);
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    }
  };

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

  // Format currency with local currency and optional USD
  const formatCurrency = (amount) => {
    if (!currencyPreferences || loading) {
      return `$${parseFloat(amount).toFixed(2)}`;
    }

    const localAmount = currencyPreferences.currency_code === 'USD' 
      ? amount 
      : (exchangeRates[amount]?.converted_amount || amount);

    const showUsd = currencyPreferences.show_usd_on_invoices && currencyPreferences.currency_code !== 'USD';
    
    return formatCurrencyWithPreferences(localAmount, currencyPreferences, {
      context: 'invoice',
      showUsdEquivalent: showUsd,
      usdAmount: amount,
    });
  };

  // Format a date string or use current date
  const formatDate = (dateString) => {
    try {
      return new Date(dateString || Date.now()).toLocaleDateString();
    } catch (e) {
      return new Date().toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  // Rest of the component remains the same, but with currency formatting
  if (style === 'classic') {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
        {/* Classic invoice template with currency support */}
        <div className="flex justify-between items-start mb-8">
          <div>
            {logo && (
              <div className="mb-4">
                <img src={logo} alt="Business Logo" className="h-16 w-auto" />
              </div>
            )}
            <h1 className="text-3xl font-bold" style={{ color: accentColor }}>
              INVOICE
            </h1>
            <p className="text-gray-600">#{invoiceNumber}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold">{business_name}</h2>
            <p>{address}</p>
            <p>{city}, {state} {zip_code}</p>
            <p>{phone}</p>
            <p>{email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-2">Bill To</h2>
            <p className="font-semibold">{`${first_name} ${last_name}`}</p>
            <p>{customer?.address || userData?.address}</p>
            <p>{customer?.city || userData?.city}, {customer?.state || userData?.state} {customer?.zip_code || userData?.zip_code}</p>
          </div>
          <div className="text-right">
            <div className="mb-4">
              <p className="text-sm text-gray-600">Issue Date</p>
              <p className="font-semibold">{formatDate(issueDate)}</p>
            </div>
            {dueDate && (
              <div>
                <p className="text-sm text-gray-600">Due Date</p>
                <p className="font-semibold">{formatDate(dueDate)}</p>
              </div>
            )}
          </div>
        </div>

        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2" style={{ borderColor: accentColor }}>
              <th className="text-left py-4 px-4 font-semibold">Description</th>
              <th className="text-right py-4 px-4 font-semibold">Qty</th>
              <th className="text-right py-4 px-4 font-semibold">Unit Price</th>
              <th className="text-right py-4 px-4 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoiceItems.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-4 px-4">
                  <p className="font-medium">{getItemName(item)}</p>
                  {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                </td>
                <td className="text-right py-4 px-4">{item.quantity}</td>
                <td className="text-right py-4 px-4">{formatCurrency(item.unitPrice || 0)}</td>
                <td className="text-right py-4 px-4">{formatCurrency(item.quantity * item.unitPrice || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-72">
            <div className="flex justify-between py-2">
              <p>Subtotal</p>
              <p>{formatCurrency(subtotal)}</p>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <p>Tax</p>
              <p>{formatCurrency(tax)}</p>
            </div>
            <div className="flex justify-between py-4 font-bold" style={{ color: accentColor }}>
              <p>Total</p>
              <p>{formatCurrency(total)}</p>
            </div>
          </div>
        </div>

        {currencyPreferences?.show_usd_on_invoices && currencyPreferences?.currency_code !== 'USD' && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center">
              <p className="text-sm text-gray-600">
                Payment will be processed in USD equivalent based on current exchange rates
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Modern template (default)
  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="border-l-4 pl-6 mb-8" style={{ borderColor: accentColor }}>
        <div className="flex justify-between items-start">
          <div>
            {logo && (
              <div className="mb-4">
                <img src={logo} alt="Business Logo" className="h-12 w-auto" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-800">INVOICE</h1>
            <p className="text-gray-600">#{invoiceNumber}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-semibold text-gray-800">{business_name}</h2>
            <p className="text-sm text-gray-600">{address}</p>
            <p className="text-sm text-gray-600">{city}, {state} {zip_code}</p>
            <p className="text-sm text-gray-600">{phone}</p>
            <p className="text-sm text-gray-600">{email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="border rounded-md p-4">
          <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Bill To</h3>
          <p className="text-sm font-semibold">{`${first_name} ${last_name}`}</p>
          <p className="text-sm">{customer?.address || userData?.address}</p>
          <p className="text-sm">{customer?.city || userData?.city}, {customer?.state || userData?.state} {customer?.zip_code || userData?.zip_code}</p>
        </div>
        <div className="border rounded-md p-4">
          <div className="mb-2">
            <p className="text-xs font-semibold uppercase text-gray-500">Issue Date</p>
            <p className="text-sm">{formatDate(issueDate)}</p>
          </div>
          {dueDate && (
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Due Date</p>
              <p className="text-sm">{formatDate(dueDate)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="border rounded-md overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="py-4 px-4 font-semibold text-gray-700">Description</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-700">Qty</th>
              <th className="text-right py-4 px-4 font-semibold text-gray-700">Unit Price</th>
              <th className="text-right py-4 px-4 font-semibold text-gray-700">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoiceItems.map((item, index) => (
              <tr key={index} className="border-t border-gray-200">
                <td className="py-4 px-4">
                  <p className="font-medium text-sm">{getItemName(item)}</p>
                  {item.description && <p className="text-xs text-gray-600">{item.description}</p>}
                </td>
                <td className="text-center py-4 px-4 text-sm">{item.quantity}</td>
                <td className="text-right py-4 px-4 text-sm">{formatCurrency(item.unitPrice || 0)}</td>
                <td className="text-right py-4 px-4 text-sm">{formatCurrency(item.quantity * item.unitPrice || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="border rounded-md">
          <div className="p-4">
            <div className="flex justify-between py-2 text-sm">
              <p>Subtotal:</p>
              <p>{formatCurrency(subtotal)}</p>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <p>Tax:</p>
              <p>{formatCurrency(tax)}</p>
            </div>
            <div className="flex justify-between py-2 text-sm font-bold border-t mt-2 pt-3">
              <p>Total:</p>
              <p>{formatCurrency(total)}</p>
            </div>
          </div>
        </div>
      </div>

      {currencyPreferences?.show_usd_on_invoices && currencyPreferences?.currency_code !== 'USD' && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-center">
            <p className="text-sm text-blue-800">
              💡 Payment will be processed in USD equivalent based on current exchange rates
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyAwareInvoicePreview;