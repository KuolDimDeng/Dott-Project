'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  CalculatorIcon,
  CreditCardIcon,
  PrinterIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import StandardSpinner from '@/components/ui/StandardSpinner';
import FieldTooltip from '@/components/ui/FieldTooltip';
import api from '@/utils/api';
import timesheetApi from '@/utils/api/timesheetApi';
import { logger } from '@/utils/logger';

// Import the individual step components
import Step1_ReviewEmployees from './steps/Step1_ReviewEmployees';
import Step2_ReviewTimesheets from './steps/Step2_ReviewTimesheets';
import Step3_CalculatePayroll from './steps/Step3_CalculatePayroll';
import Step4_ReviewPayroll from './steps/Step4_ReviewPayroll';
import Step5_ProcessPayments from './steps/Step5_ProcessPayments';
import Step6_GeneratePayStubs from './steps/Step6_GeneratePayStubs';
import Step7_Complete from './steps/Step7_Complete';

/**
 * Payroll Processing Wizard
 * Industry-standard multi-step payroll processing workflow
 */
function PayrollProcessingWizard({ onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Wizard state
  const [wizardData, setWizardData] = useState({
    payrollSettings: null,
    payPeriod: null,
    employees: [],
    selectedEmployees: [],
    timesheets: [],
    calculations: [],
    payments: [],
    payStubs: [],
    summary: {
      totalEmployees: 0,
      totalGrossPay: 0,
      totalNetPay: 0,
      totalTaxes: 0,
      totalDeductions: 0
    }
  });

  // Steps configuration
  const steps = [
    {
      number: 1,
      title: 'Review Employees',
      description: 'Select employees to include in this payroll run',
      icon: UserGroupIcon,
      component: Step1_ReviewEmployees
    },
    {
      number: 2,
      title: 'Review Timesheets',
      description: 'Verify and approve employee timesheets',
      icon: DocumentTextIcon,
      component: Step2_ReviewTimesheets
    },
    {
      number: 3,
      title: 'Calculate Payroll',
      description: 'Calculate gross pay, taxes, and deductions',
      icon: CalculatorIcon,
      component: Step3_CalculatePayroll
    },
    {
      number: 4,
      title: 'Review & Approve',
      description: 'Review calculations and approve payroll',
      icon: CheckCircleIcon,
      component: Step4_ReviewPayroll
    },
    {
      number: 5,
      title: 'Process Payments',
      description: 'Send payments via direct deposit or checks',
      icon: CreditCardIcon,
      component: Step5_ProcessPayments
    },
    {
      number: 6,
      title: 'Generate Pay Stubs',
      description: 'Create and distribute pay stubs to employees',
      icon: PrinterIcon,
      component: Step6_GeneratePayStubs
    },
    {
      number: 7,
      title: 'Complete',
      description: 'Payroll processing complete',
      icon: CheckCircleIcon,
      component: Step7_Complete
    }
  ];

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load payroll settings
      const settingsResponse = await api.get('/api/payroll/settings/');
      const settings = settingsResponse.data;
      
      // Calculate current pay period based on settings
      const period = calculateCurrentPayPeriod(settings);
      
      // Load employees with active status
      const employeesResponse = await api.get('/api/hr/v2/employees/', {
        params: { status: 'active' }
      });
      
      setWizardData(prev => ({
        ...prev,
        payrollSettings: settings,
        payPeriod: period,
        employees: employeesResponse.data.results || []
      }));
      
    } catch (error) {
      logger.error('Error loading initial data:', error);
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentPayPeriod = (settings) => {
    const today = new Date();
    let start, end;
    
    // This should match the logic in EnhancedTimesheet
    switch (settings.pay_frequency) {
      case 'WEEKLY':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay() + (settings.pay_weekday || 1));
        if (start > today) start.setDate(start.getDate() - 7);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
        
      case 'BIWEEKLY':
        // Simplified - in production this would track actual cycle
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay() + 1);
        const weekNum = Math.floor((start - new Date('2024-01-01')) / (14 * 24 * 60 * 60 * 1000));
        start = new Date('2024-01-01');
        start.setDate(start.getDate() + weekNum * 14);
        end = new Date(start);
        end.setDate(start.getDate() + 13);
        break;
        
      case 'SEMIMONTHLY':
        if (today.getDate() <= 15) {
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          end = new Date(today.getFullYear(), today.getMonth(), 15);
        } else {
          start = new Date(today.getFullYear(), today.getMonth(), 16);
          end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
        break;
        
      case 'MONTHLY':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
        
      default:
        // Default to weekly
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay() + 1);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
    }
    
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      payDate: calculatePayDate(end, settings.processing_lead_time || 2)
    };
  };

  const calculatePayDate = (periodEnd, leadTime) => {
    const payDate = new Date(periodEnd);
    payDate.setDate(payDate.getDate() + leadTime);
    
    // Skip weekends
    while (payDate.getDay() === 0 || payDate.getDay() === 6) {
      payDate.setDate(payDate.getDate() + 1);
    }
    
    return format(payDate, 'yyyy-MM-dd');
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateWizardData = (data) => {
    setWizardData(prev => ({
      ...prev,
      ...data
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <StandardSpinner size="lg" />
      </div>
    );
  }

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Process Payroll</h2>
            <p className="text-gray-600 mt-1">
              Pay Period: {format(parseISO(wizardData.payPeriod.start), 'MMM dd')} - {format(parseISO(wizardData.payPeriod.end), 'MMM dd, yyyy')}
            </p>
            <p className="text-sm text-gray-500">
              Pay Date: {format(parseISO(wizardData.payPeriod.payDate), 'MMM dd, yyyy')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.number === currentStep;
            const isCompleted = step.number < currentStep;
            
            return (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
                  <div
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-full
                      ${isActive ? 'bg-blue-600 text-white' : ''}
                      ${isCompleted ? 'bg-green-600 text-white' : ''}
                      ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-600' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircleIcon className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                      Step {step.number}: {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-green-600' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <CurrentStepComponent
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          onNext={handleNext}
          onPrevious={handlePrevious}
          isFirstStep={currentStep === 1}
          isLastStep={currentStep === steps.length}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Previous
        </button>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Step {currentStep} of {steps.length}
          </span>
        </div>
        
        <button
          onClick={handleNext}
          disabled={currentStep === steps.length}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          Next
          <ArrowRightIcon className="h-4 w-4 ml-2" />
        </button>
      </div>
    </div>
  );
}

export default PayrollProcessingWizard;