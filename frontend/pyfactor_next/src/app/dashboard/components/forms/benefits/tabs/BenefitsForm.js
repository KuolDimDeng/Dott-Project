'use client';


import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { fetchEmployeeBenefits, updateEmployeeBenefits } from '@/utils/api/benefits';

const BenefitsForm = ({ employeeId, onBenefitsUpdated }) => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [formData, setFormData] = useState({
    healthInsurance: {
      planName: '',
      coverageLevel: 'individual',
      premium: 0,
      deductible: 0
    },
    dentalInsurance: {
      planName: '',
      coverageLevel: 'individual',
      premium: 0
    },
    visionInsurance: {
      planName: '',
      coverageLevel: 'individual',
      premium: 0
    },
    retirementPlans: {
      contributionPercentage: 5,
      companyMatch: 4,
      investmentStrategy: 'moderate'
    },
    additionalBenefits: {
      flexibleSpendingAccount: false,
      fsaContribution: 0,
      lifeInsurance: false,
      lifeInsuranceCoverage: 0,
      otherBenefits: []
    }
  });

  // Health insurance plan options
  const healthPlans = [
    { name: 'Basic Health Plan', premium: 150, deductible: 2000 },
    { name: 'Standard Health Plan', premium: 250, deductible: 1000 },
    { name: 'Premium Health Plan', premium: 350, deductible: 500 }
  ];

  // Dental insurance plan options
  const dentalPlans = [
    { name: 'Basic Dental Plan', premium: 30 },
    { name: 'Standard Dental Plan', premium: 50 },
    { name: 'Premium Dental Plan', premium: 70 }
  ];

  // Vision insurance plan options
  const visionPlans = [
    { name: 'Basic Vision Plan', premium: 15 },
    { name: 'Standard Vision Plan', premium: 25 },
    { name: 'Premium Vision Plan', premium: 35 }
  ];

  // Coverage level options
  const coverageLevels = [
    { value: 'individual', label: 'Individual' },
    { value: 'spouse', label: 'Employee + Spouse' },
    { value: 'family', label: 'Family' }
  ];

  // Investment strategy options
  const investmentStrategies = [
    { value: 'conservative', label: 'Conservative' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'aggressive', label: 'Aggressive' }
  ];

  useEffect(() => {
    const loadBenefits = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchEmployeeBenefits(employeeId);
        if (data) {
          setFormData(data);
        }
      } catch (err) {
        console.error('Error loading benefits:', err);
        setError('Failed to load benefits information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      loadBenefits();
    }
  }, [employeeId]);

  const handleHealthPlanChange = (e) => {
    const selectedPlan = healthPlans.find(plan => plan.name === e.target.value);
    if (selectedPlan) {
      setFormData({
        ...formData,
        healthInsurance: {
          ...formData.healthInsurance,
          planName: selectedPlan.name,
          premium: selectedPlan.premium,
          deductible: selectedPlan.deductible
        }
      });
    }
  };

  const handleDentalPlanChange = (e) => {
    const selectedPlan = dentalPlans.find(plan => plan.name === e.target.value);
    if (selectedPlan) {
      setFormData({
        ...formData,
        dentalInsurance: {
          ...formData.dentalInsurance,
          planName: selectedPlan.name,
          premium: selectedPlan.premium
        }
      });
    }
  };

  const handleVisionPlanChange = (e) => {
    const selectedPlan = visionPlans.find(plan => plan.name === e.target.value);
    if (selectedPlan) {
      setFormData({
        ...formData,
        visionInsurance: {
          ...formData.visionInsurance,
          planName: selectedPlan.name,
          premium: selectedPlan.premium
        }
      });
    }
  };

  const handleCoverageLevelChange = (type, value) => {
    setFormData({
      ...formData,
      [type]: {
        ...formData[type],
        coverageLevel: value
      }
    });
  };

  const handleRetirementChange = (field, value) => {
    setFormData({
      ...formData,
      retirementPlans: {
        ...formData.retirementPlans,
        [field]: value
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await updateEmployeeBenefits(employeeId, formData);
      setNotification({
        show: true,
        message: 'Benefits updated successfully!',
        type: 'success'
      });
      if (onBenefitsUpdated) {
        onBenefitsUpdated(true);
      }
    } catch (err) {
      console.error('Error updating benefits:', err);
      setError('Failed to update benefits. Please try again later.');
      setNotification({
        show: true,
        message: 'Failed to update benefits. Please try again.',
        type: 'error'
      });
    } finally {
      setSaving(false);
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setNotification({ ...notification, show: false });
      }, 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !formData.healthInsurance.planName) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Notification */}
      {notification.show && (
        <div className={`p-4 rounded-md ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {notification.message}
        </div>
      )}

      {/* Health Insurance Section */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Health Insurance</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="health-plan" className="block text-sm font-medium text-gray-700">
                Plan
              </label>
              <select
                id="health-plan"
                name="health-plan"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.healthInsurance.planName}
                onChange={handleHealthPlanChange}
              >
                <option value="">Select a plan</option>
                {healthPlans.map((plan) => (
                  <option key={plan.name} value={plan.name}>
                    {plan.name} - {formatCurrency(plan.premium)}/month
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Coverage Level</label>
              <div className="mt-2 space-y-2">
                {coverageLevels.map((level) => (
                  <div key={level.value} className="flex items-center">
                    <input
                      id={`health-${level.value}`}
                      name="health-coverage"
                      type="radio"
                      checked={formData.healthInsurance.coverageLevel === level.value}
                      onChange={() => handleCoverageLevelChange('healthInsurance', level.value)}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label htmlFor={`health-${level.value}`} className="ml-3 block text-sm font-medium text-gray-700">
                      {level.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-3">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Monthly Premium:</span> {formatCurrency(formData.healthInsurance.premium)}
              </div>
            </div>

            <div className="sm:col-span-3">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Annual Deductible:</span> {formatCurrency(formData.healthInsurance.deductible)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dental Insurance Section */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Dental Insurance</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="dental-plan" className="block text-sm font-medium text-gray-700">
                Plan
              </label>
              <select
                id="dental-plan"
                name="dental-plan"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.dentalInsurance.planName}
                onChange={handleDentalPlanChange}
              >
                <option value="">Select a plan</option>
                {dentalPlans.map((plan) => (
                  <option key={plan.name} value={plan.name}>
                    {plan.name} - {formatCurrency(plan.premium)}/month
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Coverage Level</label>
              <div className="mt-2 space-y-2">
                {coverageLevels.map((level) => (
                  <div key={level.value} className="flex items-center">
                    <input
                      id={`dental-${level.value}`}
                      name="dental-coverage"
                      type="radio"
                      checked={formData.dentalInsurance.coverageLevel === level.value}
                      onChange={() => handleCoverageLevelChange('dentalInsurance', level.value)}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label htmlFor={`dental-${level.value}`} className="ml-3 block text-sm font-medium text-gray-700">
                      {level.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-6">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Monthly Premium:</span> {formatCurrency(formData.dentalInsurance.premium)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vision Insurance Section */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Vision Insurance</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="vision-plan" className="block text-sm font-medium text-gray-700">
                Plan
              </label>
              <select
                id="vision-plan"
                name="vision-plan"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.visionInsurance.planName}
                onChange={handleVisionPlanChange}
              >
                <option value="">Select a plan</option>
                {visionPlans.map((plan) => (
                  <option key={plan.name} value={plan.name}>
                    {plan.name} - {formatCurrency(plan.premium)}/month
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Coverage Level</label>
              <div className="mt-2 space-y-2">
                {coverageLevels.map((level) => (
                  <div key={level.value} className="flex items-center">
                    <input
                      id={`vision-${level.value}`}
                      name="vision-coverage"
                      type="radio"
                      checked={formData.visionInsurance.coverageLevel === level.value}
                      onChange={() => handleCoverageLevelChange('visionInsurance', level.value)}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label htmlFor={`vision-${level.value}`} className="ml-3 block text-sm font-medium text-gray-700">
                      {level.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-6">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Monthly Premium:</span> {formatCurrency(formData.visionInsurance.premium)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Retirement Plans Section */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Retirement Plans</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <label htmlFor="contribution-percentage" className="block text-sm font-medium text-gray-700">
                401(k) Contribution Percentage
              </label>
              <input
                type="range"
                id="contribution-percentage"
                name="contribution-percentage"
                min="0"
                max="15"
                step="1"
                value={formData.retirementPlans.contributionPercentage}
                onChange={(e) => handleRetirementChange('contributionPercentage', parseInt(e.target.value))}
                className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-600 px-1">
                <span>0%</span>
                <span>15%</span>
              </div>
              <div className="text-center text-sm font-medium mt-2">
                {formData.retirementPlans.contributionPercentage}%
              </div>
            </div>

            <div className="sm:col-span-3">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Company matches up to:</span> {formData.retirementPlans.companyMatch}% of your salary
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="investment-strategy" className="block text-sm font-medium text-gray-700">
                Investment Strategy
              </label>
              <select
                id="investment-strategy"
                name="investment-strategy"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.retirementPlans.investmentStrategy}
                onChange={(e) => handleRetirementChange('investmentStrategy', e.target.value)}
              >
                {investmentStrategies.map((strategy) => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Section */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Summary</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Total Monthly Premium:</span> {formatCurrency(
                  formData.healthInsurance.premium +
                  formData.dentalInsurance.premium +
                  formData.visionInsurance.premium
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Total Annual Cost:</span> {formatCurrency(
                  (formData.healthInsurance.premium +
                  formData.dentalInsurance.premium +
                  formData.visionInsurance.premium) * 12
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                saving ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              disabled={saving}
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Save Benefits
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default BenefitsForm; 