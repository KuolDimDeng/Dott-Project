'use client';


import React, { useEffect, useState } from 'react';
import { fetchEmployeeBenefits } from '@/utils/api/benefits';

const BenefitsSummary = ({ employeeId }) => {
  const [benefits, setBenefits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadBenefits = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchEmployeeBenefits(employeeId);
        setBenefits(data);
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

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
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

  if (!benefits) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">No benefits information available.</p>
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

  const formatPercentage = (value) => {
    return `${value}%`;
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Health Insurance */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800">Health Insurance</h3>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="mb-2">
                <p className="text-sm text-gray-500">Plan</p>
                <p className="font-medium">{benefits.healthInsurance.planName}</p>
              </div>
              <div className="mb-2">
                <p className="text-sm text-gray-500">Coverage Level</p>
                <p className="font-medium">{benefits.healthInsurance.coverageLevel}</p>
              </div>
              <div className="mb-2">
                <p className="text-sm text-gray-500">Premium</p>
                <p className="font-medium">{formatCurrency(benefits.healthInsurance.premium)} / month</p>
              </div>
              <div className="mb-2">
                <p className="text-sm text-gray-500">Deductible</p>
                <p className="font-medium">{formatCurrency(benefits.healthInsurance.deductible)} / year</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dental Insurance */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800">Dental Insurance</h3>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="mb-2">
                <p className="text-sm text-gray-500">Plan</p>
                <p className="font-medium">{benefits.dentalInsurance.planName}</p>
              </div>
              <div className="mb-2">
                <p className="text-sm text-gray-500">Coverage Level</p>
                <p className="font-medium">{benefits.dentalInsurance.coverageLevel}</p>
              </div>
              <div className="mb-2">
                <p className="text-sm text-gray-500">Premium</p>
                <p className="font-medium">{formatCurrency(benefits.dentalInsurance.premium)} / month</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vision Insurance */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800">Vision Insurance</h3>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="mb-2">
                <p className="text-sm text-gray-500">Plan</p>
                <p className="font-medium">{benefits.visionInsurance.planName}</p>
              </div>
              <div className="mb-2">
                <p className="text-sm text-gray-500">Coverage Level</p>
                <p className="font-medium">{benefits.visionInsurance.coverageLevel}</p>
              </div>
              <div className="mb-2">
                <p className="text-sm text-gray-500">Premium</p>
                <p className="font-medium">{formatCurrency(benefits.visionInsurance.premium)} / month</p>
              </div>
            </div>
          </div>
        </div>

        {/* Retirement Plans */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800">Retirement Plans</h3>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="mb-2">
                <p className="text-sm text-gray-500">401(k) Contribution</p>
                <p className="font-medium">{formatPercentage(benefits.retirementPlans.contributionPercentage)} of salary</p>
              </div>
              <div className="mb-2">
                <p className="text-sm text-gray-500">Company Match</p>
                <p className="font-medium">Up to {formatPercentage(benefits.retirementPlans.companyMatch)}</p>
              </div>
              <div className="mb-2">
                <p className="text-sm text-gray-500">Investment Strategy</p>
                <p className="font-medium">{benefits.retirementPlans.investmentStrategy}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Benefits */}
      <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
        <div className="p-5">
          <div className="flex items-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-800">Additional Benefits</h3>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Flexible Spending Account</p>
                <p className="font-medium">{benefits.additionalBenefits.flexibleSpendingAccount ? 'Enrolled' : 'Not Enrolled'}</p>
                {benefits.additionalBenefits.flexibleSpendingAccount && (
                  <p className="text-sm text-gray-600 mt-1">
                    Annual contribution: {formatCurrency(benefits.additionalBenefits.fsaContribution)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Life Insurance</p>
                <p className="font-medium">{benefits.additionalBenefits.lifeInsurance ? 'Enrolled' : 'Not Enrolled'}</p>
                {benefits.additionalBenefits.lifeInsurance && (
                  <p className="text-sm text-gray-600 mt-1">
                    Coverage: {formatCurrency(benefits.additionalBenefits.lifeInsuranceCoverage)}
                  </p>
                )}
              </div>
            </div>
            
            {benefits.additionalBenefits.otherBenefits.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Other Benefits</p>
                <div className="flex flex-wrap gap-2">
                  {benefits.additionalBenefits.otherBenefits.map((benefit, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Total Summary */}
      <div className="bg-gray-50 rounded-lg shadow overflow-hidden mt-6 p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Cost Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Monthly Premium</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(
                benefits.healthInsurance.premium +
                benefits.dentalInsurance.premium +
                benefits.visionInsurance.premium
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Annual Cost</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(
                (benefits.healthInsurance.premium +
                benefits.dentalInsurance.premium +
                benefits.visionInsurance.premium) * 12
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenefitsSummary; 