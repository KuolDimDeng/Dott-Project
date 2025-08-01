'use client';

import React, { useState, useEffect } from 'react';
import { taxesApi } from '@/services/api/taxes';
import { toast } from 'react-hot-toast';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

const TaxFormsManagement = () => {
  const [loading, setLoading] = useState(true);
  const [taxForms, setTaxForms] = useState([]);
  const [formTemplates, setFormTemplates] = useState([]);
  const [filingDeadlines, setFilingDeadlines] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [formToGenerate, setFormToGenerate] = useState({
    form_type: '',
    tax_year: selectedYear,
    quarter: ''
  });

  useEffect(() => {
    fetchTaxFormsData();
  }, [selectedYear, filterStatus]);

  const fetchTaxFormsData = async () => {
    try {
      setLoading(true);
      
      // Fetch tax forms
      const formsResponse = await taxesApi.forms.getAll({ 
        year: selectedYear, 
        status: filterStatus 
      });
      if (formsResponse.data) {
        setTaxForms(formsResponse.data);
      }
      
      // Fetch form templates
      const templatesResponse = await taxesApi.forms.getTemplates();
      if (templatesResponse.data) {
        setFormTemplates(templatesResponse.data);
      }
      
      // Fetch filing deadlines
      const deadlinesResponse = await taxesApi.forms.getDeadlines({ year: selectedYear });
      if (deadlinesResponse.data) {
        setFilingDeadlines(deadlinesResponse.data);
      }
    } catch (error) {
      console.error('Error fetching tax forms data:', error);
      toast.error('Failed to load tax forms data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForm = async () => {
    try {
      await taxesApi.forms.generate(formToGenerate);
      toast.success('Tax form generated successfully');
      setShowGenerateModal(false);
      setFormToGenerate({ form_type: '', tax_year: selectedYear, quarter: '' });
      fetchTaxFormsData();
    } catch (error) {
      console.error('Error generating tax form:', error);
      toast.error('Failed to generate tax form');
    }
  };

  const handleDownloadForm = async (formId) => {
    try {
      const response = await taxesApi.forms.download(formId);
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tax_form_${formId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading form:', error);
      toast.error('Failed to download form');
    }
  };

  const handleFileForm = async (formId) => {
    try {
      await taxesApi.forms.file(formId);
      toast.success('Tax form filed successfully');
      fetchTaxFormsData();
    } catch (error) {
      console.error('Error filing form:', error);
      toast.error('Failed to file form');
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      draft: 'bg-gray-100 text-gray-800',
      ready: 'bg-blue-100 text-blue-800',
      filed: 'bg-green-100 text-green-800',
      amended: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getUpcomingDeadlines = () => {
    const today = new Date();
    return filingDeadlines
      .filter(deadline => new Date(deadline.due_date) > today)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 5);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <CenteredSpinner size="medium" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tax Forms Management</h1>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Generate Form
        </button>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">Upcoming Filing Deadlines</h3>
        <div className="space-y-2">
          {getUpcomingDeadlines().map((deadline, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="font-medium">{deadline.form_type}</span>
              <span className="text-sm text-gray-600">
                Due: {new Date(deadline.due_date).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          {[...Array(5)].map((_, i) => {
            const year = new Date().getFullYear() - i;
            return (
              <option key={year} value={year}>{year}</option>
            );
          })}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready to File</option>
          <option value="filed">Filed</option>
          <option value="amended">Amended</option>
        </select>
      </div>

      {/* Tax Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {taxForms.map((form) => (
          <div key={form.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{form.form_type}</h3>
              {getStatusBadge(form.status)}
            </div>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p>Tax Year: {form.tax_year}</p>
              {form.quarter && <p>Quarter: {form.quarter}</p>}
              <p>Created: {new Date(form.created_date).toLocaleDateString()}</p>
              {form.filed_date && (
                <p>Filed: {new Date(form.filed_date).toLocaleDateString()}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownloadForm(form.id)}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                Download
              </button>
              {form.status === 'ready' && (
                <button
                  onClick={() => handleFileForm(form.id)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  File
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Common Forms Quick Access */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Common Tax Forms</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {formTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                setFormToGenerate({ ...formToGenerate, form_type: template.form_type });
                setShowGenerateModal(true);
              }}
              className="p-4 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium">{template.form_type}</div>
              <div className="text-xs text-gray-500 mt-1">{template.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Form Modal */}
      {showGenerateModal && (
        <div className="absolute inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Generate Tax Form</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Form Type</label>
                <select
                  value={formToGenerate.form_type}
                  onChange={(e) => setFormToGenerate({ ...formToGenerate, form_type: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                >
                  <option value="">Select Form Type</option>
                  <option value="941">Form 941 - Quarterly Employment Tax</option>
                  <option value="940">Form 940 - Annual FUTA Tax</option>
                  <option value="W-2">Form W-2 - Wage and Tax Statement</option>
                  <option value="W-3">Form W-3 - Transmittal of W-2s</option>
                  <option value="1099-MISC">Form 1099-MISC</option>
                  <option value="1099-NEC">Form 1099-NEC</option>
                  <option value="1096">Form 1096 - Annual Summary</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax Year</label>
                <select
                  value={formToGenerate.tax_year}
                  onChange={(e) => setFormToGenerate({ ...formToGenerate, tax_year: parseInt(e.target.value) })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                >
                  {[...Array(3)].map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <option key={year} value={year}>{year}</option>
                    );
                  })}
                </select>
              </div>
              {['941'].includes(formToGenerate.form_type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quarter</label>
                  <select
                    value={formToGenerate.quarter}
                    onChange={(e) => setFormToGenerate({ ...formToGenerate, quarter: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                  >
                    <option value="">Select Quarter</option>
                    <option value="Q1">Q1 (Jan-Mar)</option>
                    <option value="Q2">Q2 (Apr-Jun)</option>
                    <option value="Q3">Q3 (Jul-Sep)</option>
                    <option value="Q4">Q4 (Oct-Dec)</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateForm}
                disabled={!formToGenerate.form_type}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxFormsManagement;