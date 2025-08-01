import React, { useState, useEffect } from 'react';
import { DocumentTextIcon, ArrowDownTrayIcon, PaperAirplaneIcon, CheckCircleIcon, XCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { StandardSpinner } from '@/components/ui/StandardSpinner';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

const W2Management = ({ taxYear }) => {
  const [loading, setLoading] = useState(false);
  const [w2Forms, setW2Forms] = useState([]);
  const [selectedForms, setSelectedForms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCorrectModal, setShowCorrectModal] = useState(false);
  const [selectedW2, setSelectedW2] = useState(null);
  const [correctionData, setCorrectionData] = useState({});

  useEffect(() => {
    fetchW2Forms();
  }, [taxYear]);

  const fetchW2Forms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/taxes/year-end/w2-forms/', {
        params: { tax_year: taxYear }
      });
      setW2Forms(response.data);
    } catch (error) {
      console.error('Error fetching W-2 forms:', error);
      toast.error('Failed to load W-2 forms');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateW2s = async () => {
    try {
      setLoading(true);
      const response = await api.post('/taxes/year-end/w2-forms/generate_year/', {
        tax_year: taxYear,
        regenerate: false
      });
      
      toast.success(`Generated ${response.data.w2_count} W-2 forms successfully`);
      fetchW2Forms(); // Refresh the list
    } catch (error) {
      console.error('Error generating W-2s:', error);
      toast.error(error.response?.data?.error || 'Failed to generate W-2 forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (w2Id) => {
    try {
      const response = await api.get(`/taxes/year-end/w2-forms/${w2Id}/download_pdf/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `W2_${taxYear}_${w2Id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('W-2 PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading W-2 PDF:', error);
      toast.error('Failed to download W-2 PDF');
    }
  };

  const handleDistribute = async (w2Id) => {
    try {
      await api.post(`/taxes/year-end/w2-forms/${w2Id}/distribute/`, {
        method: 'email'
      });
      
      toast.success('W-2 distributed successfully');
      fetchW2Forms(); // Refresh to update status
    } catch (error) {
      console.error('Error distributing W-2:', error);
      toast.error('Failed to distribute W-2');
    }
  };

  const handleBulkDownload = async () => {
    if (selectedForms.length === 0) {
      toast.error('Please select forms to download');
      return;
    }

    for (const w2Id of selectedForms) {
      await handleDownloadPDF(w2Id);
    }
  };

  const handleBulkDistribute = async () => {
    if (selectedForms.length === 0) {
      toast.error('Please select forms to distribute');
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      
      for (const w2Id of selectedForms) {
        try {
          await api.post(`/taxes/year-end/w2-forms/${w2Id}/distribute/`, {
            method: 'email'
          });
          successCount++;
        } catch (error) {
          console.error(`Error distributing W-2 ${w2Id}:`, error);
        }
      }
      
      toast.success(`Distributed ${successCount} W-2 forms successfully`);
      fetchW2Forms();
      setSelectedForms([]);
    } catch (error) {
      console.error('Error in bulk distribution:', error);
      toast.error('Failed to complete bulk distribution');
    } finally {
      setLoading(false);
    }
  };

  const handleCorrectW2 = async () => {
    try {
      const response = await api.post(`/taxes/year-end/w2-forms/${selectedW2.id}/correct/`, correctionData);
      
      toast.success('W-2 corrected successfully');
      setShowCorrectModal(false);
      setSelectedW2(null);
      setCorrectionData({});
      fetchW2Forms();
    } catch (error) {
      console.error('Error correcting W-2:', error);
      toast.error('Failed to correct W-2');
    }
  };

  const filteredForms = w2Forms.filter(form => {
    const matchesSearch = form.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         form.control_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || form.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: null },
      generated: { color: 'bg-blue-100 text-blue-800', icon: null },
      distributed: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      corrected: { color: 'bg-yellow-100 text-yellow-800', icon: null },
      voided: { color: 'bg-red-100 text-red-800', icon: XCircleIcon }
    };

    const config = statusConfig[status] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon && <config.icon className="h-3 w-3 mr-1" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading && w2Forms.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <StandardSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleGenerateW2s}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <StandardSpinner size="small" />
              ) : (
                <>
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  Generate W-2s
                </>
              )}
            </button>
            
            {selectedForms.length > 0 && (
              <>
                <button
                  onClick={handleBulkDownload}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Download Selected ({selectedForms.length})
                </button>
                
                <button
                  onClick={handleBulkDistribute}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  Distribute Selected
                </button>
              </>
            )}
          </div>
          
          <div className="text-sm text-gray-600">
            {w2Forms.length} W-2 forms for tax year {taxYear}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee name or control number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="generated">Generated</option>
            <option value="distributed">Distributed</option>
            <option value="corrected">Corrected</option>
            <option value="voided">Voided</option>
          </select>
        </div>
      </div>

      {/* W-2 Forms Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedForms(filteredForms.map(f => f.id));
                    } else {
                      setSelectedForms([]);
                    }
                  }}
                  checked={selectedForms.length === filteredForms.length && filteredForms.length > 0}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Control Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wages
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Federal Tax
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
            {filteredForms.map((form) => (
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
                  <div className="text-sm font-medium text-gray-900">{form.employee_name}</div>
                  <div className="text-sm text-gray-500">ID: {form.employee_id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {form.control_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${parseFloat(form.wages_tips_other).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${parseFloat(form.federal_income_tax_withheld).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(form.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleDownloadPDF(form.id)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Download
                  </button>
                  {form.status === 'generated' && (
                    <button
                      onClick={() => handleDistribute(form.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Distribute
                    </button>
                  )}
                  {form.status !== 'voided' && (
                    <button
                      onClick={() => {
                        setSelectedW2(form);
                        setCorrectionData({
                          wages_tips_other: form.wages_tips_other,
                          federal_income_tax_withheld: form.federal_income_tax_withheld
                        });
                        setShowCorrectModal(true);
                      }}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      Correct
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredForms.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No W-2 forms found
          </div>
        )}
      </div>

      {/* Correction Modal */}
      {showCorrectModal && selectedW2 && (
        <div className="absolute inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowCorrectModal(false)} />
            
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Correct W-2 Form</h3>
              <p className="text-sm text-gray-600 mb-4">
                Correcting W-2 for: {selectedW2.employee_name}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wages, Tips, Other Compensation
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={correctionData.wages_tips_other || ''}
                    onChange={(e) => setCorrectionData({
                      ...correctionData,
                      wages_tips_other: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Federal Income Tax Withheld
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={correctionData.federal_income_tax_withheld || ''}
                    onChange={(e) => setCorrectionData({
                      ...correctionData,
                      federal_income_tax_withheld: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correction Reason
                  </label>
                  <textarea
                    value={correctionData.correction_reason || ''}
                    onChange={(e) => setCorrectionData({
                      ...correctionData,
                      correction_reason: e.target.value
                    })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCorrectModal(false)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCorrectW2}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Corrected W-2
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default W2Management;