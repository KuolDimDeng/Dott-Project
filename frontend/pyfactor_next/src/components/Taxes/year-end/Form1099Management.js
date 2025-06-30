import React, { useState, useEffect } from 'react';
import { DocumentTextIcon, ArrowDownTrayIcon, PaperAirplaneIcon, CheckCircleIcon, ExclamationTriangleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { StandardSpinner } from '@/components/ui/StandardSpinner';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

const Form1099Management = ({ taxYear }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('vendors');
  const [vendors, setVendors] = useState([]);
  const [form1099s, setForm1099s] = useState([]);
  const [selectedForms, setSelectedForms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formType, setFormType] = useState('1099-NEC');

  useEffect(() => {
    if (activeTab === 'vendors') {
      fetchVendorsRequiring1099();
    } else {
      fetchForm1099s();
    }
  }, [taxYear, activeTab, formType]);

  const fetchVendorsRequiring1099 = async () => {
    try {
      setLoading(true);
      const response = await api.get('/taxes/year-end/1099-forms/vendors_requiring_1099/', {
        params: { tax_year: taxYear }
      });
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors requiring 1099');
    } finally {
      setLoading(false);
    }
  };

  const fetchForm1099s = async () => {
    try {
      setLoading(true);
      const response = await api.get('/taxes/year-end/1099-forms/', {
        params: { 
          tax_year: taxYear,
          form_type: formType
        }
      });
      setForm1099s(response.data);
    } catch (error) {
      console.error('Error fetching 1099 forms:', error);
      toast.error('Failed to load 1099 forms');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate1099s = async () => {
    try {
      setLoading(true);
      const response = await api.post('/taxes/year-end/1099-forms/generate_year/', {
        tax_year: taxYear
      });
      
      toast.success(
        `Generated ${response.data['1099_nec_count']} 1099-NEC and ${response.data['1099_misc_count']} 1099-MISC forms`
      );
      
      setActiveTab('forms');
      fetchForm1099s();
    } catch (error) {
      console.error('Error generating 1099s:', error);
      toast.error(error.response?.data?.error || 'Failed to generate 1099 forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (formId) => {
    try {
      const response = await api.get(`/taxes/year-end/1099-forms/${formId}/download_pdf/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${formType}_${taxYear}_${formId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('1099 PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading 1099 PDF:', error);
      toast.error('Failed to download 1099 PDF');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: null },
      generated: { color: 'bg-blue-100 text-blue-800', icon: null },
      distributed: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      corrected: { color: 'bg-yellow-100 text-yellow-800', icon: null },
      voided: { color: 'bg-red-100 text-red-800', icon: null }
    };

    const config = statusConfig[status] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon && <config.icon className="h-3 w-3 mr-1" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderVendorsTab = () => (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Vendors Requiring 1099 Forms</h3>
            <p className="text-sm text-gray-600 mt-1">
              {vendors.length} vendors have payments exceeding IRS thresholds for tax year {taxYear}
            </p>
          </div>
          <button
            onClick={handleGenerate1099s}
            disabled={loading || vendors.length === 0}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <StandardSpinner size="small" />
            ) : (
              <>
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Generate All 1099s
              </>
            )}
          </button>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                TIN
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Payments
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Forms Required
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                TIN Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vendors.map((vendor) => (
              <tr key={vendor.vendor_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                  <div className="text-sm text-gray-500">ID: {vendor.vendor_id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {vendor.tin || 'Not provided'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${parseFloat(vendor.total_payments).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {vendor.forms_required.map((form) => (
                      <span
                        key={form}
                        className="inline-flex px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded"
                      >
                        {form}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {vendor.tin_valid ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="flex items-center text-yellow-600">
                      <ExclamationTriangleIcon className="h-5 w-5 mr-1" />
                      <span className="text-sm">Invalid</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {vendors.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No vendors require 1099 forms for tax year {taxYear}
          </div>
        )}
      </div>

      {/* Payment Breakdown */}
      {vendors.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Payment Categories Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {['nonemployee_compensation', 'rent', 'other_income', 'attorney_payments'].map((category) => {
              const total = vendors.reduce((sum, vendor) => 
                sum + parseFloat(vendor.payment_breakdown[category] || 0), 0
              );
              
              if (total === 0) return null;
              
              return (
                <div key={category} className="border rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <p className="text-xl font-semibold">${total.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderFormsTab = () => (
    <div className="space-y-6">
      {/* Form Type Selector */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Form Type:</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="1099-NEC">1099-NEC</option>
              <option value="1099-MISC">1099-MISC</option>
            </select>
          </div>
          
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by vendor name or TIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Forms Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedForms(form1099s.map(f => f.id));
                    } else {
                      setSelectedForms([]);
                    }
                  }}
                  checked={selectedForms.length === form1099s.length && form1099s.length > 0}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recipient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                TIN
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {form1099s
              .filter(form => 
                form.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                form.recipient_tin.includes(searchTerm)
              )
              .map((form) => (
              <tr key={form.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedForms.includes(form.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedForms([...selectedForms, form.id]);
                      } else {
                        setSelectedForms(selectedForms.filter(id => id !== form.id));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{form.recipient_name}</div>
                  <div className="text-sm text-gray-500">{form.vendor_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {form.recipient_tin}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${parseFloat(
                    formType === '1099-NEC' ? 
                      form.nonemployee_compensation : 
                      (form.rents || 0) + (form.other_income || 0) + (form.gross_proceeds_attorney || 0)
                  ).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(form.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleDownloadPDF(form.id)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {form1099s.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No {formType} forms found for tax year {taxYear}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedForms.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedForms.length} forms selected
            </span>
            <div className="space-x-2">
              <button
                onClick={async () => {
                  for (const formId of selectedForms) {
                    await handleDownloadPDF(formId);
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Download Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (loading && vendors.length === 0 && form1099s.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <StandardSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('vendors')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'vendors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Vendors Requiring 1099
          </button>
          <button
            onClick={() => setActiveTab('forms')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'forms'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Generated Forms
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'vendors' ? renderVendorsTab() : renderFormsTab()}
    </div>
  );
};

export default Form1099Management;