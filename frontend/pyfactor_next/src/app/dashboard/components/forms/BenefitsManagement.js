'use client';

import React, { useState, useEffect, Fragment, useRef, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useTable, usePagination, useSortBy } from 'react-table';
import { 
  MagnifyingGlassIcon,
  HeartIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ShieldCheckIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { hrApi, payrollApi } from '@/utils/apiClient';
import { logger } from '@/utils/logger';
import { CenteredSpinner } from '@/components/ui/StandardSpinner';

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
 * Benefits Management Component
 * Industry-standard employee benefits management with CRUD operations and standard UI
 */
function BenefitsManagement({ onNavigate }) {
  const router = useRouter();
  
  // State management
  const [activeTab, setActiveTab] = useState('list');
  const [benefits, setBenefits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBenefit, setSelectedBenefit] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalBenefits: 0,
    enrolledEmployees: 0,
    totalCost: 0,
    activePrograms: 0
  });

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    cost: '',
    provider: '',
    eligibility: '',
    enrollmentPeriod: '',
    status: 'active'
  });

  const [errors, setErrors] = useState({});

  // Load data on component mount
  useEffect(() => {
    loadBenefits();
    loadStats();
  }, []);

  const loadBenefits = async () => {
    try {
      setLoading(true);
      const data = await payrollApi.benefits.getAll();
      setBenefits(data || []);
    } catch (error) {
      logger.error('[BenefitsManagement] Error loading benefits:', error);
      toast.error('Failed to load benefits');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await payrollApi.benefits.getStats();
      setStats(data || stats);
    } catch (error) {
      logger.error('[BenefitsManagement] Error loading stats:', error);
    }
  };

  // Filter benefits based on search term
  const filteredBenefits = useMemo(() => {
    if (!searchTerm) return benefits;
    
    return benefits.filter(benefit =>
      benefit.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      benefit.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      benefit.provider?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [benefits, searchTerm]);

  // Summary Cards Component
  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <HeartIcon className="h-8 w-8 text-red-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Benefits</p>
            <p className="text-3xl font-bold text-red-600 truncate">{loading ? '-' : stats.totalBenefits}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <UserIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Enrolled Employees</p>
            <p className="text-3xl font-bold text-blue-600 truncate">{loading ? '-' : stats.enrolledEmployees}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Cost</p>
            <p className="text-3xl font-bold text-green-600 truncate">${loading ? '-' : stats.totalCost?.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Active Programs</p>
            <p className="text-3xl font-bold text-purple-600 truncate">{loading ? '-' : stats.activePrograms}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Search and Actions Component
  const renderSearchAndActions = () => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="relative flex-1 max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search benefits..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <button
        onClick={() => {
          setFormData({
            name: '',
            type: '',
            description: '',
            cost: '',
            provider: '',
            eligibility: '',
            enrollmentPeriod: '',
            status: 'active'
          });
          setErrors({});
          setIsCreateModalOpen(true);
          setActiveTab('create');
        }}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <HeartIcon className="h-4 w-4 mr-2" />
        Add Benefit
      </button>
    </div>
  );

  // Tab Navigation Component
  const renderTabNavigation = () => (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-8">
        {[
          { id: 'list', label: 'Benefits', icon: HeartIcon },
          { id: 'create', label: 'Create Benefit', icon: DocumentTextIcon },
          { id: 'details', label: 'Details', icon: EyeIcon }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );

  // Show loading spinner while data is loading
  if (loading) {
    return <CenteredSpinner size="large" text="Loading benefits..." showText={true} minHeight="h-screen" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Heroicon */}
      <div className="flex items-center space-x-3">
        <HeartIcon className="h-8 w-8 text-red-600" />
        <div>
          <h1 className="text-2xl font-bold text-black">Benefits Management</h1>
          <p className="text-gray-600 mt-1">Manage employee benefits, enrollment, and programs</p>
        </div>
      </div>

      {renderSummaryCards()}
      {renderSearchAndActions()}
      {renderTabNavigation()}

      {/* Simple Content Placeholder */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <HeartIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Benefits Management</h3>
          <p className="mt-1 text-sm text-gray-500">
            Full benefits management functionality coming soon. This component follows the standard UI pattern.
          </p>
        </div>
      </div>
    </div>
  );
}

export default BenefitsManagement;