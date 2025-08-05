import React, { useState, useEffect } from 'react';
import { ClockIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

const GenerationHistory = () => {
  const [loading, setLoading] = useState(false);
  const [generations, setGenerations] = useState([]);
  const [selectedGeneration, setSelectedGeneration] = useState(null);

  useEffect(() => {
    fetchGenerationHistory();
    
    // Set up polling for active generations
    const interval = setInterval(() => {
      const hasActiveGeneration = generations.some(g => 
        ['pending', 'processing'].includes(g.status)
      );
      if (hasActiveGeneration) {
        fetchGenerationHistory();
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchGenerationHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/taxes/year-end/generation/');
      setGenerations(response.data);
    } catch (error) {
      console.error('Error fetching generation history:', error);
      toast.error('Failed to load generation history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-gray-100 text-gray-800' },
      processing: { color: 'bg-blue-100 text-blue-800' },
      completed: { color: 'bg-green-100 text-green-800' },
      failed: { color: 'bg-red-100 text-red-800' },
      partial: { color: 'bg-yellow-100 text-yellow-800' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDuration = (startedAt, completedAt) => {
    if (!startedAt || !completedAt) return '-';
    
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const durationMs = end - start;
    
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  if (loading && generations.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <StandardSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Generation History</h3>
          <button
            onClick={fetchGenerationHistory}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tax Year
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Forms Generated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Initiated By
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {generations.map((generation) => (
              <tr 
                key={generation.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedGeneration(generation)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(generation.created_at).toLocaleDateString()}
                  <br />
                  <span className="text-xs text-gray-500">
                    {new Date(generation.created_at).toLocaleTimeString()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {generation.tax_year}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {generation.generation_type === 'w2_w3' && 'W-2 & W-3'}
                  {generation.generation_type === '1099' && '1099 Forms'}
                  {generation.generation_type === 'all' && 'All Forms'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="space-y-1">
                    {generation.w2_count > 0 && (
                      <div>W-2: {generation.w2_count}</div>
                    )}
                    {generation.form_1099_nec_count > 0 && (
                      <div>1099-NEC: {generation.form_1099_nec_count}</div>
                    )}
                    {generation.form_1099_misc_count > 0 && (
                      <div>1099-MISC: {generation.form_1099_misc_count}</div>
                    )}
                    {generation.total_forms_generated === 0 && (
                      <div className="text-gray-500">None</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(generation.status)}
                    {getStatusBadge(generation.status)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDuration(generation.started_at, generation.completed_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {generation.initiated_by}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {generations.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No generation history found
          </div>
        )}
      </div>

      {/* Generation Details Modal */}
      {selectedGeneration && (
        <div className="absolute inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75" onClick={() => setSelectedGeneration(null)} />
            
            <div className="relative bg-white rounded-lg max-w-2xl w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Generation Details</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Generation ID</label>
                  <p className="text-sm text-gray-900">{selectedGeneration.id}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tax Year</label>
                  <p className="text-sm text-gray-900">{selectedGeneration.tax_year}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="text-sm text-gray-900">
                    {selectedGeneration.generation_type === 'w2_w3' && 'W-2 & W-3 Forms'}
                    {selectedGeneration.generation_type === '1099' && '1099 Forms'}
                    {selectedGeneration.generation_type === 'all' && 'All Year-End Forms'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusIcon(selectedGeneration.status)}
                    {getStatusBadge(selectedGeneration.status)}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Started At</label>
                  <p className="text-sm text-gray-900">
                    {selectedGeneration.started_at ? 
                      new Date(selectedGeneration.started_at).toLocaleString() : 
                      '-'
                    }
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Completed At</label>
                  <p className="text-sm text-gray-900">
                    {selectedGeneration.completed_at ? 
                      new Date(selectedGeneration.completed_at).toLocaleString() : 
                      '-'
                    }
                  </p>
                </div>
              </div>
              
              {/* Forms Generated */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Forms Generated</label>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">W-2 Forms:</span>
                      <span className="ml-2 font-medium">{selectedGeneration.w2_count}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">W-3 Generated:</span>
                      <span className="ml-2 font-medium">{selectedGeneration.w3_generated ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">1099-NEC Forms:</span>
                      <span className="ml-2 font-medium">{selectedGeneration.form_1099_nec_count}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">1099-MISC Forms:</span>
                      <span className="ml-2 font-medium">{selectedGeneration.form_1099_misc_count}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">1096 Generated:</span>
                      <span className="ml-2 font-medium">{selectedGeneration.form_1096_generated ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Total Forms:</span>
                      <span className="ml-2 font-medium">{selectedGeneration.total_forms_generated}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Error Message */}
              {selectedGeneration.error_message && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Error Details</label>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-800">{selectedGeneration.error_message}</p>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedGeneration(null)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerationHistory;