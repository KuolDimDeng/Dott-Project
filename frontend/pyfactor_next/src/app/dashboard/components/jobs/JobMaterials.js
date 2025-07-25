'use client';

import React, { useState, useEffect } from 'react';
import { jobService } from '@/services/jobService';
import { logger } from '@/utils/logger';
import { 
  CubeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const JobMaterials = ({ jobs = [] }) => {
  const [selectedJob, setSelectedJob] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [availableSupplies, setAvailableSupplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [materialForm, setMaterialForm] = useState({
    supply_id: '',
    name: '',
    quantity: '',
    unit: '',
    unit_cost: '',
    total_cost: '',
    notes: ''
  });

  useEffect(() => {
    fetchAvailableSupplies();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchJobMaterials();
    }
  }, [selectedJob]);

  useEffect(() => {
    // Calculate total cost when quantity or unit cost changes
    const quantity = parseFloat(materialForm.quantity) || 0;
    const unitCost = parseFloat(materialForm.unit_cost) || 0;
    const totalCost = quantity * unitCost;
    setMaterialForm(prev => ({ ...prev, total_cost: totalCost.toFixed(2) }));
  }, [materialForm.quantity, materialForm.unit_cost]);

  const fetchAvailableSupplies = async () => {
    try {
      const supplies = await jobService.getAvailableSupplies();
      setAvailableSupplies(supplies);
    } catch (err) {
      logger.error('Error fetching supplies:', err);
    }
  };

  const fetchJobMaterials = async () => {
    if (!selectedJob) return;
    
    setLoading(true);
    try {
      const materialsData = await jobService.getJobMaterials(selectedJob.id);
      setMaterials(materialsData);
    } catch (err) {
      logger.error('Error fetching job materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSupplySelect = (e) => {
    const supplyId = e.target.value;
    const supply = availableSupplies.find(s => s.id.toString() === supplyId);
    
    if (supply) {
      setMaterialForm({
        ...materialForm,
        supply_id: supplyId,
        name: supply.name,
        unit: supply.unit || 'each',
        unit_cost: supply.price || ''
      });
    } else {
      setMaterialForm({
        ...materialForm,
        supply_id: supplyId
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      if (editingMaterial) {
        await jobService.updateJobMaterial(selectedJob.id, editingMaterial.id, materialForm);
      } else {
        await jobService.addJobMaterial(selectedJob.id, materialForm);
      }
      
      fetchJobMaterials();
      resetForm();
    } catch (err) {
      logger.error('Error saving material:', err);
      alert('Failed to save material');
    }
  };

  const handleDelete = async (materialId) => {
    if (!selectedJob || !confirm('Are you sure you want to remove this material?')) return;

    try {
      await jobService.removeJobMaterial(selectedJob.id, materialId);
      fetchJobMaterials();
    } catch (err) {
      logger.error('Error deleting material:', err);
      alert('Failed to remove material');
    }
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setMaterialForm({
      supply_id: material.supply_id || '',
      name: material.name || '',
      quantity: material.quantity || '',
      unit: material.unit || '',
      unit_cost: material.unit_cost || '',
      total_cost: material.total_cost || '',
      notes: material.notes || ''
    });
    setShowAddMaterial(true);
  };

  const resetForm = () => {
    setMaterialForm({
      supply_id: '',
      name: '',
      quantity: '',
      unit: '',
      unit_cost: '',
      total_cost: '',
      notes: ''
    });
    setEditingMaterial(null);
    setShowAddMaterial(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const calculateTotalMaterialCost = () => {
    return materials.reduce((sum, material) => sum + (parseFloat(material.total_cost) || 0), 0);
  };

  const filteredJobs = jobs.filter(job => 
    job.job_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center mb-4">
          <CubeIcon className="h-8 w-8 text-blue-600 mr-3" />
          Materials Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Track materials used in each job and monitor inventory consumption
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Selection */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Select a Job</h3>
            </div>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredJobs.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">No jobs found</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredJobs.map((job) => (
                  <li
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`px-6 py-4 hover:bg-gray-50 cursor-pointer ${
                      selectedJob?.id === job.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{job.job_number}</p>
                        <p className="text-sm text-gray-600">{job.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{job.customer?.name}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                        ${job.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          job.status === 'in_progress' ? 'bg-orange-100 text-orange-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {job.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Materials List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedJob ? `Materials for ${selectedJob.job_number}` : 'Materials'}
              </h3>
              {selectedJob && (
                <button
                  onClick={() => setShowAddMaterial(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Material
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : selectedJob ? (
              <>
                {materials.length === 0 ? (
                  <div className="text-center py-12">
                    <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No materials added yet</p>
                    <button
                      onClick={() => setShowAddMaterial(true)}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      Add First Material
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {materials.map((material) => (
                            <tr key={material.id}>
                              <td className="px-3 py-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{material.name}</p>
                                  {material.notes && (
                                    <p className="text-xs text-gray-500">{material.notes}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {material.quantity} {material.unit}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {formatCurrency(material.unit_cost)}
                              </td>
                              <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                {formatCurrency(material.total_cost)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={() => handleEdit(material)}
                                  className="text-blue-600 hover:text-blue-700 mr-2"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(material.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50">
                            <td colSpan="3" className="px-3 py-2 text-sm font-medium text-gray-900">
                              Total Material Cost
                            </td>
                            <td className="px-3 py-2 text-sm font-bold text-gray-900">
                              {formatCurrency(calculateTotalMaterialCost())}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Low inventory warning */}
                    {materials.some(m => m.low_stock) && (
                      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex">
                          <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" />
                          <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                              Some materials are running low in inventory. Consider restocking soon.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  Select a job to view and manage materials
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Material Modal */}
      {showAddMaterial && selectedJob && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingMaterial ? 'Edit Material' : 'Add Material'}
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Supply Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Select from Inventory
                  </label>
                  <select
                    value={materialForm.supply_id}
                    onChange={handleSupplySelect}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Custom Material</option>
                    {availableSupplies.map((supply) => (
                      <option key={supply.id} value={supply.id}>
                        {supply.name} - {formatCurrency(supply.price)}/{supply.unit}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Material Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Material Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={materialForm.name}
                    onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Quantity and Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={materialForm.quantity}
                      onChange={(e) => setMaterialForm({ ...materialForm, quantity: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={materialForm.unit}
                      onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
                      placeholder="e.g., each, ft, kg"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Unit Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Unit Cost *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={materialForm.unit_cost}
                      onChange={(e) => setMaterialForm({ ...materialForm, unit_cost: e.target.value })}
                      className="pl-7 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Total Cost (calculated) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Total Cost
                  </label>
                  <div className="mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md">
                    {formatCurrency(materialForm.total_cost)}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    value={materialForm.notes}
                    onChange={(e) => setMaterialForm({ ...materialForm, notes: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingMaterial ? 'Update' : 'Add'} Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobMaterials;