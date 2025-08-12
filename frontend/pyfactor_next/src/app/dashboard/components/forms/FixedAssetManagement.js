'use client';

import React, { useState, useEffect, Fragment, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { accountingApi } from '@/utils/apiClient';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';
import {
  BuildingOfficeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  TruckIcon,
  ComputerDesktopIcon,
  WrenchScrewdriverIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  DocumentChartBarIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  QrCodeIcon,
  MapPinIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Fixed Asset Management Component
 * Industry-standard asset tracking and depreciation with backend connectivity
 */
function FixedAssetManagement({ onNavigate }) {
  const router = useRouter();
  const [tenantId, setTenantId] = useState(null);
  
  // State management
  const [activeTab, setActiveTab] = useState('list');
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDepreciationModalOpen, setIsDepreciationModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalValue: 0,
    totalDepreciation: 0,
    currentBookValue: 0,
    activeAssets: 0,
    disposedAssets: 0
  });
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    assetTag: '',
    category: '',
    description: '',
    acquisitionDate: new Date().toISOString().split('T')[0],
    acquisitionCost: '',
    depreciationMethod: 'straight-line',
    usefulLife: '',
    salvageValue: '',
    location: '',
    status: 'active',
    vendor: '',
    warrantyExpiry: '',
    maintenanceSchedule: 'quarterly',
    notes: ''
  });

  // Depreciation data
  const [depreciationSchedule, setDepreciationSchedule] = useState([]);
  
  // Initialize tenant ID
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);

  // Fetch fixed assets
  const fetchAssets = useCallback(async () => {
    if (!tenantId) return;
    
    logger.debug('[FixedAssets] Fetching assets for tenant:', tenantId);
    setLoading(true);

    try {
      // Fetch from API proxy endpoint
      const response = await fetch('/api/accounting/fixed-assets')
        .then(res => res.json())
        .catch(err => {
          logger.error('[FixedAssets] API error:', err);
          return { assets: [] };
        });

      // Use real data from backend
      const assetData = response?.assets || [];
      setAssets(assetData);
      
      // Set categories from backend or defaults
      const categories = response?.categories || [
        { id: 'building', name: 'Buildings & Property' },
        { id: 'vehicle', name: 'Vehicles' },
        { id: 'equipment', name: 'Equipment & Machinery' },
        { id: 'furniture', name: 'Furniture & Fixtures' },
        { id: 'computer', name: 'Computer & IT Equipment' },
        { id: 'other', name: 'Other Assets' }
      ];
      setCategories(categories);
      
      // Set locations from backend or defaults
      const locations = response?.locations || [
        'Main Office',
        'Branch Office',
        'Warehouse',
        'Remote'
      ];
      setLocations(locations);

      // Calculate statistics
      const statsData = assetData.reduce((acc, asset) => {
        acc.totalAssets++;
        if (asset.status === 'active') {
          acc.activeAssets++;
          acc.totalValue += asset.acquisitionCost || 0;
          acc.totalDepreciation += asset.accumulatedDepreciation || 0;
          acc.currentBookValue += asset.bookValue || 0;
        } else if (asset.status === 'disposed') {
          acc.disposedAssets++;
        }
        return acc;
      }, {
        totalAssets: 0,
        totalValue: 0,
        totalDepreciation: 0,
        currentBookValue: 0,
        activeAssets: 0,
        disposedAssets: 0
      });

      setStats(statsData);
      logger.info('[FixedAssets] Assets loaded successfully');
    } catch (error) {
      logger.error('[FixedAssets] Error fetching assets:', error);
      toast.error('Failed to load fixed assets');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchAssets();
    }
  }, [tenantId, fetchAssets]);

  // Filtered assets based on search and filters
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !filterCategory || asset.category === filterCategory;
      
      const matchesStatus = 
        filterStatus === 'all' ||
        (filterStatus === 'active' && asset.status === 'active') ||
        (filterStatus === 'disposed' && asset.status === 'disposed') ||
        (filterStatus === 'maintenance' && asset.status === 'maintenance');
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [assets, searchTerm, filterCategory, filterStatus]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const assetData = {
        ...formData,
        acquisitionCost: parseFloat(formData.acquisitionCost),
        usefulLife: parseInt(formData.usefulLife),
        salvageValue: parseFloat(formData.salvageValue) || 0
      };

      if (selectedAsset) {
        await accountingApi.fixedAssets.update(selectedAsset.id, assetData);
        toast.success('Asset updated successfully');
        setIsEditModalOpen(false);
      } else {
        await accountingApi.fixedAssets.create(assetData);
        toast.success('Asset created successfully');
        setIsCreateModalOpen(false);
      }
      
      await fetchAssets();
      resetForm();
    } catch (error) {
      logger.error('[FixedAssets] Error saving asset:', error);
      toast.error('Failed to save asset');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedAsset) return;
    
    try {
      await accountingApi.fixedAssets.delete(selectedAsset.id);
      toast.success('Asset deleted successfully');
      setIsDeleteModalOpen(false);
      await fetchAssets();
      setSelectedAsset(null);
    } catch (error) {
      logger.error('[FixedAssets] Error deleting asset:', error);
      toast.error('Failed to delete asset');
    }
  };

  // Calculate depreciation schedule
  const calculateDepreciation = useCallback((asset) => {
    const schedule = [];
    const { acquisitionCost, salvageValue, usefulLife, depreciationMethod, acquisitionDate } = asset;
    const depreciableAmount = acquisitionCost - salvageValue;
    const startYear = new Date(acquisitionDate).getFullYear();
    
    let accumulatedDepreciation = 0;
    let bookValue = acquisitionCost;
    
    for (let year = 0; year < usefulLife; year++) {
      let yearlyDepreciation = 0;
      
      if (depreciationMethod === 'straight-line') {
        yearlyDepreciation = depreciableAmount / usefulLife;
      } else if (depreciationMethod === 'declining-balance') {
        const rate = 2 / usefulLife; // Double declining balance
        yearlyDepreciation = bookValue * rate;
        if (bookValue - yearlyDepreciation < salvageValue) {
          yearlyDepreciation = bookValue - salvageValue;
        }
      }
      
      accumulatedDepreciation += yearlyDepreciation;
      bookValue -= yearlyDepreciation;
      
      schedule.push({
        year: startYear + year,
        yearlyDepreciation,
        accumulatedDepreciation,
        bookValue
      });
      
      if (bookValue <= salvageValue) break;
    }
    
    return schedule;
  }, []);

  // Handle view depreciation
  const handleViewDepreciation = (asset) => {
    setSelectedAsset(asset);
    const schedule = calculateDepreciation(asset);
    setDepreciationSchedule(schedule);
    setIsDepreciationModalOpen(true);
  };

  // Export assets to CSV
  const handleExport = () => {
    const headers = ['Asset Tag', 'Name', 'Category', 'Acquisition Date', 'Cost', 'Book Value', 'Status', 'Location'];
    const rows = filteredAssets.map(asset => [
      asset.assetTag,
      asset.name,
      asset.category,
      asset.acquisitionDate,
      asset.acquisitionCost,
      asset.bookValue,
      asset.status,
      asset.location
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fixed-assets-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Assets exported successfully');
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      assetTag: '',
      category: '',
      description: '',
      acquisitionDate: new Date().toISOString().split('T')[0],
      acquisitionCost: '',
      depreciationMethod: 'straight-line',
      usefulLife: '',
      salvageValue: '',
      location: '',
      status: 'active',
      vendor: '',
      warrantyExpiry: '',
      maintenanceSchedule: 'quarterly',
      notes: ''
    });
    setSelectedAsset(null);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'building':
        return BuildingOfficeIcon;
      case 'vehicle':
        return TruckIcon;
      case 'equipment':
        return WrenchScrewdriverIcon;
      case 'furniture':
        return ArchiveBoxIcon;
      case 'computer':
        return ComputerDesktopIcon;
      default:
        return ArchiveBoxIcon;
    }
  };

  if (!tenantId || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CenteredSpinner size="medium" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-black">Fixed Asset Management</h1>
          <p className="text-gray-600 mt-1">Track and manage company assets, depreciation schedules, and maintenance records</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Assets</h3>
            <ArchiveBoxIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 truncate">{stats.totalAssets}</div>
          <p className="text-sm text-gray-600 mt-1">{stats.activeAssets} active</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Value</h3>
            <CurrencyDollarIcon className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600 truncate">{formatCurrency(stats.totalValue)}</div>
          <p className="text-sm text-gray-600 mt-1">Acquisition cost</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Depreciation</h3>
            <ChartBarIcon className="h-5 w-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-red-600 truncate">{formatCurrency(stats.totalDepreciation)}</div>
          <p className="text-sm text-gray-600 mt-1">Accumulated</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Book Value</h3>
            <DocumentChartBarIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-blue-600 truncate">{formatCurrency(stats.currentBookValue)}</div>
          <p className="text-sm text-gray-600 mt-1">Current value</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Active</h3>
            <BuildingOfficeIcon className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600 truncate">{stats.activeAssets}</div>
          <p className="text-sm text-gray-600 mt-1">In service</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Disposed</h3>
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-yellow-600 truncate">{stats.disposedAssets}</div>
          <p className="text-sm text-gray-600 mt-1">Sold/retired</p>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets by name, tag, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="maintenance">Under Maintenance</option>
              <option value="disposed">Disposed</option>
            </select>
            
            <button
              onClick={handleExport}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Export to CSV"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Add Asset
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('list')}
              className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Asset List
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'categories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              By Category
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'maintenance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Maintenance Schedule
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Asset List Tab */}
          {activeTab === 'list' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acquisition Cost
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Book Value
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAssets.map((asset) => {
                    const Icon = getCategoryIcon(asset.category);
                    return (
                      <tr key={asset.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Icon className="h-8 w-8 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                              <div className="text-sm text-gray-500">{asset.assetTag}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {categories.find(c => c.id === asset.category)?.name || asset.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <MapPinIcon className="h-4 w-4 text-gray-400 mr-1" />
                            {asset.location}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatCurrency(asset.acquisitionCost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {formatCurrency(asset.bookValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            asset.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : asset.status === 'maintenance'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {asset.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedAsset(asset);
                                setIsViewModalOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleViewDepreciation(asset)}
                              className="text-purple-600 hover:text-purple-900"
                              title="View Depreciation"
                            >
                              <ChartBarIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAsset(asset);
                                setFormData({
                                  name: asset.name,
                                  assetTag: asset.assetTag,
                                  category: asset.category,
                                  description: asset.description,
                                  acquisitionDate: asset.acquisitionDate,
                                  acquisitionCost: asset.acquisitionCost,
                                  depreciationMethod: asset.depreciationMethod,
                                  usefulLife: asset.usefulLife,
                                  salvageValue: asset.salvageValue,
                                  location: asset.location,
                                  status: asset.status,
                                  vendor: asset.vendor || '',
                                  warrantyExpiry: asset.warrantyExpiry || '',
                                  maintenanceSchedule: asset.maintenanceSchedule || 'quarterly',
                                  notes: asset.notes || ''
                                });
                                setIsEditModalOpen(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            {asset.status !== 'disposed' && (
                              <button
                                onClick={() => {
                                  setSelectedAsset(asset);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map(category => {
                const categoryAssets = assets.filter(a => a.category === category.id && a.status === 'active');
                const totalValue = categoryAssets.reduce((sum, a) => sum + (a.bookValue || 0), 0);
                const Icon = getCategoryIcon(category.id);
                
                return (
                  <div key={category.id} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Icon className="h-8 w-8 text-blue-600 mr-3" />
                        <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                      </div>
                      <span className="text-2xl font-bold text-gray-900">{categoryAssets.length}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Book Value</span>
                        <span className="font-medium text-gray-900">{formatCurrency(totalValue)}</span>
                      </div>
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Assets</h4>
                        <div className="space-y-1">
                          {categoryAssets.slice(0, 3).map(asset => (
                            <div key={asset.id} className="text-xs text-gray-600">
                              • {asset.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      {assets.filter(a => a.nextMaintenanceDate && new Date(a.nextMaintenanceDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length} assets require maintenance within the next 30 days
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asset
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Schedule
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Maintenance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Next Due
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assets.filter(a => a.status === 'active' && a.maintenanceSchedule).map((asset) => {
                      const nextDue = asset.nextMaintenanceDate ? new Date(asset.nextMaintenanceDate) : null;
                      const isOverdue = nextDue && nextDue < new Date();
                      const isDueSoon = nextDue && !isOverdue && nextDue <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                      
                      return (
                        <tr key={asset.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                            <div className="text-sm text-gray-500">{asset.assetTag}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {asset.maintenanceSchedule.charAt(0).toUpperCase() + asset.maintenanceSchedule.slice(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {asset.lastMaintenanceDate ? new Date(asset.lastMaintenanceDate).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {nextDue ? nextDue.toLocaleDateString() : 'Not scheduled'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              isOverdue 
                                ? 'bg-red-100 text-red-800' 
                                : isDueSoon
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : 'On Schedule'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Transition appear show={isCreateModalOpen || isEditModalOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={() => {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
            resetForm();
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="absolute inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="absolute inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {selectedAsset ? 'Edit Asset' : 'Add New Asset'}
                  </Dialog.Title>
                  
                  <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Asset Name
                          <FieldTooltip text="Enter a descriptive name for the asset. This should clearly identify what the asset is." />
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Asset Tag
                          <FieldTooltip text="Unique identifier for this asset. Usually a barcode or serial number." />
                        </label>
                        <div className="relative">
                          <QrCodeIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={formData.assetTag}
                            onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                          <FieldTooltip text="Select the type of asset. This helps with categorization and reporting." />
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          <option value="">Select category</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Location
                          <FieldTooltip text="Where is this asset physically located? This helps with tracking and inventory." />
                        </label>
                        <div className="relative">
                          <MapPinIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Acquisition Date
                          <FieldTooltip text="When was this asset purchased or acquired? This is the start date for depreciation." />
                        </label>
                        <div className="relative">
                          <CalendarIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="date"
                            value={formData.acquisitionDate}
                            onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Acquisition Cost
                          <FieldTooltip text="Total cost to acquire this asset including purchase price, delivery, installation, etc." />
                        </label>
                        <div className="relative">
                          <CurrencyDollarIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            value={formData.acquisitionCost}
                            onChange={(e) => setFormData({ ...formData, acquisitionCost: e.target.value })}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Depreciation Method
                          <FieldTooltip text="How should depreciation be calculated? Straight-line spreads evenly, declining balance front-loads depreciation." />
                        </label>
                        <select
                          value={formData.depreciationMethod}
                          onChange={(e) => setFormData({ ...formData, depreciationMethod: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          <option value="straight-line">Straight Line</option>
                          <option value="declining-balance">Declining Balance</option>
                          <option value="sum-of-years">Sum of Years' Digits</option>
                          <option value="units-of-production">Units of Production</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Useful Life (Years)
                          <FieldTooltip text="Expected number of years this asset will be in service. Used for depreciation calculation." />
                        </label>
                        <input
                          type="number"
                          value={formData.usefulLife}
                          onChange={(e) => setFormData({ ...formData, usefulLife: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Salvage Value
                          <FieldTooltip text="Expected value at the end of useful life. The asset won't depreciate below this amount." />
                        </label>
                        <div className="relative">
                          <CurrencyDollarIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            value={formData.salvageValue}
                            onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                          <FieldTooltip text="Current status of the asset. Active means in use, maintenance means temporarily unavailable." />
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          <option value="active">Active</option>
                          <option value="maintenance">Under Maintenance</option>
                          <option value="disposed">Disposed</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Vendor
                          <FieldTooltip text="Name of the supplier or vendor from whom the asset was purchased." />
                        </label>
                        <input
                          type="text"
                          value={formData.vendor}
                          onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Warranty Expiry
                          <FieldTooltip text="When does the warranty expire? This helps track warranty coverage." />
                        </label>
                        <input
                          type="date"
                          value={formData.warrantyExpiry}
                          onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Maintenance Schedule
                          <FieldTooltip text="How often should this asset be serviced or maintained?" />
                        </label>
                        <select
                          value={formData.maintenanceSchedule}
                          onChange={(e) => setFormData({ ...formData, maintenanceSchedule: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="semi-annual">Semi-Annual</option>
                          <option value="annual">Annual</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                        <FieldTooltip text="Additional details about the asset, its specifications, or any special features." />
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                        <FieldTooltip text="Any additional notes, maintenance instructions, or important information about this asset." />
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreateModalOpen(false);
                          setIsEditModalOpen(false);
                          resetForm();
                        }}
                        className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        {selectedAsset ? 'Update Asset' : 'Create Asset'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* View Modal */}
      <Transition appear show={isViewModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsViewModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="absolute inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="absolute inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Asset Details
                  </Dialog.Title>
                  
                  {selectedAsset && (
                    <div className="mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-4">Basic Information</h4>
                          <dl className="space-y-3">
                            <div>
                              <dt className="text-sm text-gray-500">Asset Name</dt>
                              <dd className="text-sm font-medium text-gray-900">{selectedAsset.name}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Asset Tag</dt>
                              <dd className="text-sm font-medium text-gray-900">{selectedAsset.assetTag}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Category</dt>
                              <dd className="text-sm font-medium text-gray-900">
                                {categories.find(c => c.id === selectedAsset.category)?.name || selectedAsset.category}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Location</dt>
                              <dd className="text-sm font-medium text-gray-900">{selectedAsset.location}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Status</dt>
                              <dd>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  selectedAsset.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : selectedAsset.status === 'maintenance'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {selectedAsset.status}
                                </span>
                              </dd>
                            </div>
                          </dl>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-4">Financial Information</h4>
                          <dl className="space-y-3">
                            <div>
                              <dt className="text-sm text-gray-500">Acquisition Date</dt>
                              <dd className="text-sm font-medium text-gray-900">
                                {new Date(selectedAsset.acquisitionDate).toLocaleDateString()}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Acquisition Cost</dt>
                              <dd className="text-sm font-medium text-gray-900">{formatCurrency(selectedAsset.acquisitionCost)}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Accumulated Depreciation</dt>
                              <dd className="text-sm font-medium text-red-600">
                                {formatCurrency(selectedAsset.accumulatedDepreciation || 0)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Current Book Value</dt>
                              <dd className="text-sm font-medium text-green-600">{formatCurrency(selectedAsset.bookValue)}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Depreciation Method</dt>
                              <dd className="text-sm font-medium text-gray-900">
                                {selectedAsset.depreciationMethod.split('-').map(word => 
                                  word.charAt(0).toUpperCase() + word.slice(1)
                                ).join(' ')}
                              </dd>
                            </div>
                          </dl>
                        </div>
                        
                        {selectedAsset.vendor && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-4">Vendor Information</h4>
                            <dl className="space-y-3">
                              <div>
                                <dt className="text-sm text-gray-500">Vendor</dt>
                                <dd className="text-sm font-medium text-gray-900">{selectedAsset.vendor}</dd>
                              </div>
                              {selectedAsset.warrantyExpiry && (
                                <div>
                                  <dt className="text-sm text-gray-500">Warranty Expiry</dt>
                                  <dd className="text-sm font-medium text-gray-900">
                                    {new Date(selectedAsset.warrantyExpiry).toLocaleDateString()}
                                  </dd>
                                </div>
                              )}
                            </dl>
                          </div>
                        )}
                        
                        {selectedAsset.maintenanceSchedule && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-4">Maintenance Information</h4>
                            <dl className="space-y-3">
                              <div>
                                <dt className="text-sm text-gray-500">Schedule</dt>
                                <dd className="text-sm font-medium text-gray-900">
                                  {selectedAsset.maintenanceSchedule.charAt(0).toUpperCase() + selectedAsset.maintenanceSchedule.slice(1)}
                                </dd>
                              </div>
                              {selectedAsset.lastMaintenanceDate && (
                                <div>
                                  <dt className="text-sm text-gray-500">Last Maintenance</dt>
                                  <dd className="text-sm font-medium text-gray-900">
                                    {new Date(selectedAsset.lastMaintenanceDate).toLocaleDateString()}
                                  </dd>
                                </div>
                              )}
                              {selectedAsset.nextMaintenanceDate && (
                                <div>
                                  <dt className="text-sm text-gray-500">Next Due</dt>
                                  <dd className="text-sm font-medium text-gray-900">
                                    {new Date(selectedAsset.nextMaintenanceDate).toLocaleDateString()}
                                  </dd>
                                </div>
                              )}
                            </dl>
                          </div>
                        )}
                      </div>
                      
                      {(selectedAsset.description || selectedAsset.notes) && (
                        <div className="mt-6 border-t pt-6">
                          {selectedAsset.description && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                              <p className="text-sm text-gray-600">{selectedAsset.description}</p>
                            </div>
                          )}
                          {selectedAsset.notes && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                              <p className="text-sm text-gray-600">{selectedAsset.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsViewModalOpen(false)}
                      className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Depreciation Schedule Modal */}
      <Transition appear show={isDepreciationModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsDepreciationModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="absolute inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="absolute inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Depreciation Schedule
                  </Dialog.Title>
                  
                  {selectedAsset && (
                    <div className="mt-6">
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700">{selectedAsset.name}</h4>
                        <p className="text-sm text-gray-500">
                          {selectedAsset.depreciationMethod.split('-').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')} Method
                        </p>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Year
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Annual Depreciation
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Accumulated Depreciation
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Book Value
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {depreciationSchedule.map((entry, index) => {
                              const currentYear = new Date().getFullYear();
                              const isPastYear = entry.year < currentYear;
                              const isCurrentYear = entry.year === currentYear;
                              
                              return (
                                <tr key={index} className={isCurrentYear ? 'bg-blue-50' : ''}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {entry.year}
                                    {isCurrentYear && (
                                      <span className="ml-2 text-xs text-blue-600 font-medium">(Current)</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                    {formatCurrency(entry.yearlyDepreciation)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                                    {formatCurrency(entry.accumulatedDepreciation)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                    {formatCurrency(entry.bookValue)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsDepreciationModalOpen(false)}
                      className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsDeleteModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="absolute inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="absolute inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Delete Asset
                  </Dialog.Title>
                  
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete this asset? This action cannot be undone.
                    </p>
                    {selectedAsset && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-900">{selectedAsset.name}</p>
                        <p className="text-sm text-gray-500">{selectedAsset.assetTag}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex justify-center rounded-lg border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

export default FixedAssetManagement;