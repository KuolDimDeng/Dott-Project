'use client';

import React, { useState, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import Step1_ReviewEmployees from './steps/Step1_ReviewEmployees';
import Step2_CalculatePay from './steps/Step2_CalculatePay';
import Step3_ReviewDeductions from './steps/Step3_ReviewDeductions';
import Step4_ApprovePayroll from './steps/Step4_ApprovePayroll';
import Step5_FundAccount from './steps/Step5_FundAccount';
import Step6_ProcessPayments from './steps/Step6_ProcessPayments';
import Step7_ConfirmDistribute from './steps/Step7_ConfirmDistribute';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import StandardSpinner from '@/components/ui/StandardSpinner';

const steps = [
  { id: 1, name: 'Review Employees', icon: '👥', component: Step1_ReviewEmployees },
  { id: 2, name: 'Calculate Pay', icon: '💰', component: Step2_CalculatePay },
  { id: 3, name: 'Review Deductions', icon: '📊', component: Step3_ReviewDeductions },
  { id: 4, name: 'Approve Payroll', icon: '✅', component: Step4_ApprovePayroll },
  { id: 5, name: 'Fund Account', icon: '🏦', component: Step5_FundAccount },
  { id: 6, name: 'Process Payments', icon: '💸', component: Step6_ProcessPayments },
  { id: 7, name: 'Confirm & Distribute', icon: '📨', component: Step7_ConfirmDistribute }
];

export default function PayrollWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [payrollData, setPayrollData] = useState({
    employees: [],
    payPeriod: {
      startDate: null,
      endDate: null,
      payDate: null
    },
    calculations: null,
    deductions: null,
    approvals: {},
    fundingMethod: null,
    paymentProgress: null,
    distributionTasks: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPayrollData();
  }, []);

  const loadPayrollData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payroll/current', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.currentPayroll) {
          setPayrollData(data.currentPayroll);
          setCurrentStep(data.currentStep || 1);
        }
      }
    } catch (error) {
      logger.error('Error loading payroll data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async () => {
    try {
      setSaving(true);
      await fetch('/api/payroll/save-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          currentStep,
          payrollData
        })
      });
    } catch (error) {
      logger.error('Error saving payroll progress:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    await saveProgress();
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepId) => {
    if (stepId <= currentStep) {
      setCurrentStep(stepId);
    }
  };

  const updatePayrollData = (key, value) => {
    setPayrollData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getStepStatus = (stepId) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  const CurrentStepComponent = steps[currentStep - 1].component;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <StandardSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payroll Processing Wizard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Follow the steps below to process payroll for your employees
        </p>
      </div>

      {/* Step Indicator */}
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center">
          {steps.map((step, stepIdx) => (
            <li key={step.id} className={stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''} 
                style={{ flex: stepIdx !== steps.length - 1 ? '1' : 'none' }}>
              <div className="relative">
                {/* Step circle */}
                <button
                  onClick={() => handleStepClick(step.id)}
                  disabled={step.id > currentStep}
                  className={`
                    relative flex items-center justify-center w-12 h-12 rounded-full
                    ${getStepStatus(step.id) === 'completed' 
                      ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' 
                      : getStepStatus(step.id) === 'current'
                      ? 'bg-blue-600 cursor-default'
                      : 'bg-gray-200 cursor-not-allowed'
                    }
                    transition-colors duration-200
                  `}
                  aria-current={getStepStatus(step.id) === 'current' ? 'step' : undefined}
                >
                  {getStepStatus(step.id) === 'completed' ? (
                    <CheckIcon className="w-6 h-6 text-white" />
                  ) : (
                    <span className="text-lg">{step.icon}</span>
                  )}
                </button>

                {/* Step name */}
                <span className={`
                  absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-medium whitespace-nowrap
                  ${getStepStatus(step.id) === 'current' ? 'text-blue-600' : 'text-gray-500'}
                `}>
                  {step.name}
                </span>

                {/* Connector line */}
                {stepIdx !== steps.length - 1 && (
                  <div className="absolute top-6 left-12 w-full h-0.5 bg-gray-200">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ 
                        width: getStepStatus(step.id) === 'completed' ? '100%' : '0%' 
                      }}
                    />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </nav>

      {/* Step Content */}
      <div className="mt-12 bg-white shadow rounded-lg">
        <div className="p-6">
          <CurrentStepComponent
            payrollData={payrollData}
            updatePayrollData={updatePayrollData}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isFirstStep={currentStep === 1}
            isLastStep={currentStep === steps.length}
            saving={saving}
          />
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`
              px-4 py-2 text-sm font-medium rounded-md
              ${currentStep === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 flex items-center">
            Step {currentStep} of {steps.length}
          </span>
          <button
            onClick={handleNext}
            disabled={currentStep === steps.length || saving}
            className={`
              px-4 py-2 text-sm font-medium rounded-md
              ${currentStep === steps.length || saving
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {saving ? 'Saving...' : currentStep === steps.length ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}