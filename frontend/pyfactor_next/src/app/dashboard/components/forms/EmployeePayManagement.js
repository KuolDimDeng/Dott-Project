'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { 
  CurrencyDollarIcon,
  BanknotesIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CreditCardIcon,
  ClipboardDocumentCheckIcon,
  CalculatorIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import api from '@/utils/api';
import { logger } from '@/utils/logger';
import StandardSpinner from '@/components/ui/StandardSpinner';
import FieldTooltip from '@/components/common/FieldTooltip';

/**
 * Employee Pay Management Component
 * Comprehensive payment management for employees including:
 * - Payment deposit methods (bank accounts, digital wallets)
 * - Tax withholding preferences
 * - Benefits and deductions
 * - Pay statements history
 */
function EmployeePayManagement({ onNavigate }) {
  // State management
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  
  // Payment data states
  const [depositMethods, setDepositMethods] = useState([]);
  const [withholding, setWithholding] = useState(null);
  const [benefits, setBenefits] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [payStatements, setPayStatements] = useState([]);
  
  // Modal states
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithholdingModalOpen, setIsWithholdingModalOpen] = useState(false);
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  
  // Form data
  const [depositForm, setDepositForm] = useState({
    method_type: 'DIRECT_DEPOSIT',
    bank_name: '',
    account_last_four: '',
    routing_number_last_four: '',
    account_type: 'CHECKING',
    email: '',
    phone: '',
    username: '',
    is_default: false
  });
  
  const [withholdingForm, setWithholdingForm] = useState({
    tax_year: new Date().getFullYear(),
    filing_status: 'S',
    multiple_jobs: false,
    claim_dependents: false,
    dependent_amount: 0,
    other_income: 0,
    deductions: 0,
    extra_withholding: 0,
    state_code: '',
    state_additional_withholding: 0
  });

  // Load employees on mount
  useEffect(() => {
    loadEmployees();
  }, []);

  // Load employee data when selection changes
  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeePaymentData();
    }
  }, [selectedEmployee]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/hr/v2/employees/');
      setEmployees(response.data?.data || []);
    } catch (error) {
      logger.error('[PayManagement] Error loading employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeePaymentData = async () => {
    if (!selectedEmployee) return;
    
    try {
      setLoading(true);
      
      // Load all payment-related data in parallel
      const [
        depositResponse,
        withholdingResponse,
        benefitsResponse,
        deductionsResponse,
        statementsResponse
      ] = await Promise.all([
        api.get(`/api/payroll/deposit-methods/?employee=${selectedEmployee.id}`),
        api.get(`/api/payroll/withholdings/?employee=${selectedEmployee.id}`),
        api.get(`/api/hr/benefits/?employee=${selectedEmployee.id}`),
        api.get(`/api/payroll/deductions/?employee=${selectedEmployee.id}`),
        api.get(`/api/payroll/statements/?employee=${selectedEmployee.id}`)
      ]);
      
      setDepositMethods(depositResponse.data || []);
      setWithholding(withholdingResponse.data);
      setBenefits(benefitsResponse.data || []);
      setDeductions(deductionsResponse.data || []);
      setPayStatements(statementsResponse.data?.data || []);
    } catch (error) {
      logger.error('[PayManagement] Error loading employee payment data:', error);
      toast.error('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDepositMethod = async () => {
    try {
      const response = await api.post('/api/payroll/deposit-methods/', {
        ...depositForm,
        employee: selectedEmployee.id
      });
      
      toast.success('Payment method added successfully');
      setIsDepositModalOpen(false);
      setDepositForm({
        method_type: 'DIRECT_DEPOSIT',
        bank_name: '',
        account_last_four: '',
        routing_number_last_four: '',
        account_type: 'CHECKING',
        email: '',
        phone: '',
        username: '',
        is_default: false
      });
      await loadEmployeePaymentData();
    } catch (error) {
      logger.error('[PayManagement] Error saving deposit method:', error);
      toast.error('Failed to save payment method');
    }
  };

  const handleSaveWithholding = async () => {
    try {
      const endpoint = withholding 
        ? `/api/payroll/withholdings/${withholding.id}/`
        : '/api/payroll/withholdings/';
      
      const method = withholding ? 'patch' : 'post';
      
      const response = await api[method](endpoint, {
        ...withholdingForm,
        employee: selectedEmployee.id
      });
      
      toast.success('Tax withholding preferences saved successfully');
      setIsWithholdingModalOpen(false);
      await loadEmployeePaymentData();
    } catch (error) {
      logger.error('[PayManagement] Error saving withholding:', error);
      toast.error('Failed to save tax withholding preferences');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase();
    return (
      emp.full_name?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.employee_id?.toLowerCase().includes(searchLower)
    );
  });

  const renderEmployeeList = () => (
    <div className="w-full md:w-1/3 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Employees</h3>
        <div className="mt-3 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <div className="overflow-y-auto max-h-[600px]">
        {loading ? (
          <div className="p-8 flex justify-center">
            <StandardSpinner size="lg" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No employees found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEmployees.map((employee) => (
              <button
                key={employee.id}
                onClick={() => setSelectedEmployee(employee)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  selectedEmployee?.id === employee.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{employee.full_name}</p>
                    <p className="text-sm text-gray-500">{employee.position || 'No position'}</p>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPaymentDetails = () => {
    if (!selectedEmployee) {
      return (
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center text-gray-500">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>Select an employee to view their payment information</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedEmployee.full_name}</h2>
              <p className="text-sm text-gray-500">
                {selectedEmployee.position || 'No position'} • {selectedEmployee.employee_id}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {selectedEmployee.compensation_type && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  selectedEmployee.compensation_type === 'SALARY' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {selectedEmployee.compensation_type}
                </span>
              )}
            </div>
          </div>
        </div>

        <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
          <Tab.List className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              <Tab className={({ selected }) => `
                py-3 text-sm font-medium border-b-2 transition-colors
                ${selected 
                  ? 'text-blue-600 border-blue-500' 
                  : 'text-gray-500 border-transparent hover:text-gray-700'
                }
              `}>
                Payment Methods
              </Tab>
              <Tab className={({ selected }) => `
                py-3 text-sm font-medium border-b-2 transition-colors
                ${selected 
                  ? 'text-blue-600 border-blue-500' 
                  : 'text-gray-500 border-transparent hover:text-gray-700'
                }
              `}>
                Tax Withholding
              </Tab>
              <Tab className={({ selected }) => `
                py-3 text-sm font-medium border-b-2 transition-colors
                ${selected 
                  ? 'text-blue-600 border-blue-500' 
                  : 'text-gray-500 border-transparent hover:text-gray-700'
                }
              `}>
                Benefits & Deductions
              </Tab>
              <Tab className={({ selected }) => `
                py-3 text-sm font-medium border-b-2 transition-colors
                ${selected 
                  ? 'text-blue-600 border-blue-500' 
                  : 'text-gray-500 border-transparent hover:text-gray-700'
                }
              `}>
                Pay Statements
              </Tab>
            </div>
          </Tab.List>

          <Tab.Panels className="p-6">
            {/* Payment Methods Tab */}
            <Tab.Panel>
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Payment Deposit Methods</h3>
                  <button
                    onClick={() => setIsDepositModalOpen(true)}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Method
                  </button>
                </div>

                {depositMethods.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-gray-500">No payment methods configured</p>
                    <button
                      onClick={() => setIsDepositModalOpen(true)}
                      className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Add a payment method
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {depositMethods.map((method) => (
                      <div key={method.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <BanknotesIcon className="h-8 w-8 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {method.method_type === 'DIRECT_DEPOSIT' 
                                  ? `${method.bank_name} - ****${method.account_last_four}`
                                  : method.get_method_type_display
                                }
                              </p>
                              <p className="text-sm text-gray-500">
                                {method.method_type === 'DIRECT_DEPOSIT' 
                                  ? `${method.account_type} • Routing ****${method.routing_number_last_four}`
                                  : method.email || method.phone || method.username
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {method.is_default && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                Default
                              </span>
                            )}
                            {method.is_active ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            ) : (
                              <ExclamationCircleIcon className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tab.Panel>

            {/* Tax Withholding Tab */}
            <Tab.Panel>
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Tax Withholding Information</h3>
                  <button
                    onClick={() => {
                      if (withholding) {
                        setWithholdingForm({
                          tax_year: withholding.tax_year,
                          filing_status: withholding.filing_status,
                          multiple_jobs: withholding.multiple_jobs,
                          claim_dependents: withholding.claim_dependents,
                          dependent_amount: withholding.dependent_amount,
                          other_income: withholding.other_income,
                          deductions: withholding.deductions,
                          extra_withholding: withholding.extra_withholding,
                          state_code: withholding.state_code || '',
                          state_additional_withholding: withholding.state_additional_withholding
                        });
                      }
                      setIsWithholdingModalOpen(true);
                    }}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    {withholding ? 'Update' : 'Setup'} W-4
                  </button>
                </div>

                {withholding ? (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tax Year</label>
                        <p className="text-sm text-gray-900">{withholding.tax_year}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Filing Status</label>
                        <p className="text-sm text-gray-900">
                          {withholding.filing_status === 'S' && 'Single or Married filing separately'}
                          {withholding.filing_status === 'M' && 'Married filing jointly'}
                          {withholding.filing_status === 'H' && 'Head of household'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Multiple Jobs</label>
                        <p className="text-sm text-gray-900">{withholding.multiple_jobs ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Extra Withholding</label>
                        <p className="text-sm text-gray-900">${withholding.extra_withholding}</p>
                      </div>
                      {withholding.state_code && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-500">State</label>
                            <p className="text-sm text-gray-900">{withholding.state_code}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">State Additional Withholding</label>
                            <p className="text-sm text-gray-900">${withholding.state_additional_withholding}</p>
                          </div>
                        </>
                      )}
                    </div>
                    {withholding.is_electronically_signed && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                          Electronically signed on {new Date(withholding.signature_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-gray-500">No tax withholding information on file</p>
                    <button
                      onClick={() => setIsWithholdingModalOpen(true)}
                      className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Setup W-4 Information
                    </button>
                  </div>
                )}
              </div>
            </Tab.Panel>

            {/* Benefits & Deductions Tab */}
            <Tab.Panel>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Benefits</h3>
                    <button
                      onClick={() => setIsBenefitModalOpen(true)}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Benefit
                    </button>
                  </div>
                  
                  {benefits.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No benefits configured</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {benefits.map((benefit) => (
                        <div key={benefit.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">{benefit.name}</p>
                              <p className="text-sm text-gray-500">
                                ${benefit.employee_contribution}/month
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              benefit.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {benefit.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Deductions</h3>
                    <button
                      onClick={() => setIsDeductionModalOpen(true)}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Deduction
                    </button>
                  </div>
                  
                  {deductions.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No deductions configured</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {deductions.map((deduction) => (
                        <div key={deduction.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">{deduction.name}</p>
                              <p className="text-sm text-gray-500">
                                ${deduction.amount}/{deduction.frequency}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              deduction.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {deduction.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Tab.Panel>

            {/* Pay Statements Tab */}
            <Tab.Panel>
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Pay Statements</h3>
                
                {payStatements.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-gray-500">No pay statements available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payStatements.map((statement) => (
                      <div key={statement.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {new Date(statement.pay_date).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              Pay Period: {new Date(statement.pay_period_start).toLocaleDateString()} - {new Date(statement.pay_period_end).toLocaleDateString()}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-sm">
                              <span className="text-gray-600">
                                Gross: <span className="font-medium text-gray-900">${statement.gross_pay}</span>
                              </span>
                              <span className="text-gray-600">
                                Net: <span className="font-medium text-green-600">${statement.net_pay}</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              statement.statement_type === 'REGULAR' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {statement.statement_type}
                            </span>
                            {statement.pdf_url && (
                              <a
                                href={statement.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <DocumentTextIcon className="h-5 w-5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    );
  };

  // Deposit Method Modal
  const renderDepositModal = () => (
    <Transition appear show={isDepositModalOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setIsDepositModalOpen(false)}>
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
                  Add Payment Method
                </Dialog.Title>
                
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Type
                    </label>
                    <select
                      value={depositForm.method_type}
                      onChange={(e) => setDepositForm({ ...depositForm, method_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DIRECT_DEPOSIT">Direct Deposit (Bank)</option>
                      <option value="PAYPAL">PayPal</option>
                      <option value="VENMO">Venmo</option>
                      <option value="CASHAPP">Cash App</option>
                      <option value="CHECK">Physical Check</option>
                    </select>
                  </div>

                  {depositForm.method_type === 'DIRECT_DEPOSIT' && (
                    <>
                      <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                          Bank Name
                          <FieldTooltip content="Name of the financial institution" />
                        </label>
                        <input
                          type="text"
                          value={depositForm.bank_name}
                          onChange={(e) => setDepositForm({ ...depositForm, bank_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Chase Bank"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account Last 4
                          </label>
                          <input
                            type="text"
                            maxLength="4"
                            value={depositForm.account_last_four}
                            onChange={(e) => setDepositForm({ ...depositForm, account_last_four: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="1234"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Routing Last 4
                          </label>
                          <input
                            type="text"
                            maxLength="4"
                            value={depositForm.routing_number_last_four}
                            onChange={(e) => setDepositForm({ ...depositForm, routing_number_last_four: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="5678"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Account Type
                        </label>
                        <select
                          value={depositForm.account_type}
                          onChange={(e) => setDepositForm({ ...depositForm, account_type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="CHECKING">Checking</option>
                          <option value="SAVINGS">Savings</option>
                        </select>
                      </div>
                    </>
                  )}

                  {['PAYPAL', 'VENMO'].includes(depositForm.method_type) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={depositForm.email}
                        onChange={(e) => setDepositForm({ ...depositForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="email@example.com"
                      />
                    </div>
                  )}

                  {depositForm.method_type === 'CASHAPP' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cash App Username
                      </label>
                      <input
                        type="text"
                        value={depositForm.username}
                        onChange={(e) => setDepositForm({ ...depositForm, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="$username"
                      />
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={depositForm.is_default}
                      onChange={(e) => setDepositForm({ ...depositForm, is_default: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Set as default payment method
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    onClick={() => setIsDepositModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    onClick={handleSaveDepositMethod}
                  >
                    Save
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );

  // Withholding Modal
  const renderWithholdingModal = () => (
    <Transition appear show={isWithholdingModalOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setIsWithholdingModalOpen(false)}>
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
                  Tax Withholding Information (W-4)
                </Dialog.Title>
                
                <div className="mt-4 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                        Tax Year
                        <FieldTooltip content="The tax year for this W-4 form" />
                      </label>
                      <input
                        type="number"
                        value={withholdingForm.tax_year}
                        onChange={(e) => setWithholdingForm({ ...withholdingForm, tax_year: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                        Filing Status
                        <FieldTooltip content="Your tax filing status" />
                      </label>
                      <select
                        value={withholdingForm.filing_status}
                        onChange={(e) => setWithholdingForm({ ...withholdingForm, filing_status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="S">Single or Married filing separately</option>
                        <option value="M">Married filing jointly</option>
                        <option value="H">Head of household</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={withholdingForm.multiple_jobs}
                        onChange={(e) => setWithholdingForm({ ...withholdingForm, multiple_jobs: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Multiple Jobs or Spouse Works</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={withholdingForm.claim_dependents}
                        onChange={(e) => setWithholdingForm({ ...withholdingForm, claim_dependents: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Claim Dependents</span>
                    </label>
                  </div>

                  {withholdingForm.claim_dependents && (
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                        Dependent Amount
                        <FieldTooltip content="Total amount to claim for dependents" />
                      </label>
                      <input
                        type="number"
                        value={withholdingForm.dependent_amount}
                        onChange={(e) => setWithholdingForm({ ...withholdingForm, dependent_amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                        Other Income
                        <FieldTooltip content="Income from other sources (interest, dividends, retirement)" />
                      </label>
                      <input
                        type="number"
                        value={withholdingForm.other_income}
                        onChange={(e) => setWithholdingForm({ ...withholdingForm, other_income: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                        Deductions
                        <FieldTooltip content="Deductions other than standard deduction" />
                      </label>
                      <input
                        type="number"
                        value={withholdingForm.deductions}
                        onChange={(e) => setWithholdingForm({ ...withholdingForm, deductions: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                        Extra Withholding
                        <FieldTooltip content="Additional amount to withhold from each paycheck" />
                      </label>
                      <input
                        type="number"
                        value={withholdingForm.extra_withholding}
                        onChange={(e) => setWithholdingForm({ ...withholdingForm, extra_withholding: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">State Withholding</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State Code
                        </label>
                        <input
                          type="text"
                          maxLength="2"
                          value={withholdingForm.state_code}
                          onChange={(e) => setWithholdingForm({ ...withholdingForm, state_code: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., CA"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State Additional Withholding
                        </label>
                        <input
                          type="number"
                          value={withholdingForm.state_additional_withholding}
                          onChange={(e) => setWithholdingForm({ ...withholdingForm, state_additional_withholding: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    onClick={() => setIsWithholdingModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    onClick={handleSaveWithholding}
                  >
                    Save W-4 Information
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center space-x-3">
        <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold text-black">Pay Management</h1>
          <p className="text-gray-600 mt-1">Manage employee payment methods, tax withholdings, benefits, and deductions</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row gap-6">
        {renderEmployeeList()}
        {renderPaymentDetails()}
      </div>

      {/* Modals */}
      {renderDepositModal()}
      {renderWithholdingModal()}
    </div>
  );
}

export default EmployeePayManagement;