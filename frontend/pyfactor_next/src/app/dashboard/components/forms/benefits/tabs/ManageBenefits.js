'use client';


import React, { useState } from 'react';

const ManageBenefits = ({ userData }) => {
  const [selectedBenefits, setSelectedBenefits] = useState({
    health: true,
    dental: true,
    vision: true,
    retirement: true,
    lifeInsurance: false,
    disability: false
  });
  
  // Add state for selected plan options
  const [selectedPlans, setSelectedPlans] = useState({
    healthPlan: 'basic',
    dentalPlan: 'basic',
    visionPlan: 'basic',
    coverageType: 'individual'
  });
  
  const handleToggleBenefit = (benefit) => {
    setSelectedBenefits({
      ...selectedBenefits,
      [benefit]: !selectedBenefits[benefit]
    });
  };
  
  // Add handler for radio button changes
  const handlePlanChange = (planType, value) => {
    setSelectedPlans({
      ...selectedPlans,
      [planType]: value
    });
  };
  
  return (
    <div>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              We are working to provide these benefits options in the future. This page will allow you to select and manage your benefits.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Select Your Benefits</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose the benefits you want to enroll in. Changes will take effect on the next pay period.
        </p>
      </div>
      
      <div className="space-y-6">
        {/* Health Insurance */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h4 className="text-md font-medium text-gray-800">Health Insurance</h4>
            <label className="flex items-center">
              <span className="mr-3 text-sm text-gray-600">
                {selectedBenefits.health ? 'Enrolled' : 'Not Enrolled'}
              </span>
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input 
                  type="checkbox" 
                  name="health" 
                  id="health"
                  checked={selectedBenefits.health}
                  onChange={() => handleToggleBenefit('health')}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label 
                  htmlFor="health" 
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    selectedBenefits.health ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              </div>
            </label>
          </div>
          
          {selectedBenefits.health && (
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="health-basic"
                    name="health-plan"
                    type="radio"
                    checked={selectedPlans.healthPlan === 'basic'}
                    onChange={() => handlePlanChange('healthPlan', 'basic')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="health-basic" className="ml-3">
                    <div className="text-sm font-medium text-gray-800">Basic Plan</div>
                    <div className="text-sm text-gray-600">$75 per pay period - $1,500 deductible</div>
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="health-standard"
                    name="health-plan"
                    type="radio"
                    checked={selectedPlans.healthPlan === 'standard'}
                    onChange={() => handlePlanChange('healthPlan', 'standard')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="health-standard" className="ml-3">
                    <div className="text-sm font-medium text-gray-800">Standard Plan</div>
                    <div className="text-sm text-gray-600">$125 per pay period - $750 deductible</div>
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="health-premium"
                    name="health-plan"
                    type="radio"
                    checked={selectedPlans.healthPlan === 'premium'}
                    onChange={() => handlePlanChange('healthPlan', 'premium')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="health-premium" className="ml-3">
                    <div className="text-sm font-medium text-gray-800">Premium Plan</div>
                    <div className="text-sm text-gray-600">$200 per pay period - $250 deductible</div>
                  </label>
                </div>
                
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Coverage Type</div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        id="individual"
                        name="coverage-type"
                        type="radio"
                        checked={selectedPlans.coverageType === 'individual'}
                        onChange={() => handlePlanChange('coverageType', 'individual')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="individual" className="ml-2 text-sm text-gray-700">
                        Individual
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="family"
                        name="coverage-type"
                        type="radio"
                        checked={selectedPlans.coverageType === 'family'}
                        onChange={() => handlePlanChange('coverageType', 'family')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="family" className="ml-2 text-sm text-gray-700">
                        Family
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Dental Insurance */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h4 className="text-md font-medium text-gray-800">Dental Insurance</h4>
            <label className="flex items-center">
              <span className="mr-3 text-sm text-gray-600">
                {selectedBenefits.dental ? 'Enrolled' : 'Not Enrolled'}
              </span>
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input 
                  type="checkbox" 
                  name="dental" 
                  id="dental"
                  checked={selectedBenefits.dental}
                  onChange={() => handleToggleBenefit('dental')}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label 
                  htmlFor="dental" 
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    selectedBenefits.dental ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              </div>
            </label>
          </div>
          
          {selectedBenefits.dental && (
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="dental-basic"
                    name="dental-plan"
                    type="radio"
                    checked={selectedPlans.dentalPlan === 'basic'}
                    onChange={() => handlePlanChange('dentalPlan', 'basic')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="dental-basic" className="ml-3">
                    <div className="text-sm font-medium text-gray-800">Basic Plan</div>
                    <div className="text-sm text-gray-600">$15 per pay period - Basic preventive care</div>
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="dental-premium"
                    name="dental-plan"
                    type="radio"
                    checked={selectedPlans.dentalPlan === 'premium'}
                    onChange={() => handlePlanChange('dentalPlan', 'premium')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="dental-premium" className="ml-3">
                    <div className="text-sm font-medium text-gray-800">Premium Plan</div>
                    <div className="text-sm text-gray-600">$25 per pay period - Includes orthodontia</div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Vision Insurance */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h4 className="text-md font-medium text-gray-800">Vision Insurance</h4>
            <label className="flex items-center">
              <span className="mr-3 text-sm text-gray-600">
                {selectedBenefits.vision ? 'Enrolled' : 'Not Enrolled'}
              </span>
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input 
                  type="checkbox" 
                  name="vision" 
                  id="vision"
                  checked={selectedBenefits.vision}
                  onChange={() => handleToggleBenefit('vision')}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label 
                  htmlFor="vision" 
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    selectedBenefits.vision ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              </div>
            </label>
          </div>
          
          {selectedBenefits.vision && (
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="vision-basic"
                    name="vision-plan"
                    type="radio"
                    checked={selectedPlans.visionPlan === 'basic'}
                    onChange={() => handlePlanChange('visionPlan', 'basic')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="vision-basic" className="ml-3">
                    <div className="text-sm font-medium text-gray-800">Basic Plan</div>
                    <div className="text-sm text-gray-600">$5 per pay period - Annual exam and basic glasses</div>
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="vision-premium"
                    name="vision-plan"
                    type="radio"
                    checked={selectedPlans.visionPlan === 'premium'}
                    onChange={() => handlePlanChange('visionPlan', 'premium')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="vision-premium" className="ml-3">
                    <div className="text-sm font-medium text-gray-800">Premium Plan</div>
                    <div className="text-sm text-gray-600">$10 per pay period - Includes designer frames and contacts</div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Retirement Plan */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h4 className="text-md font-medium text-gray-800">Retirement Plan (401k)</h4>
            <label className="flex items-center">
              <span className="mr-3 text-sm text-gray-600">
                {selectedBenefits.retirement ? 'Enrolled' : 'Not Enrolled'}
              </span>
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input 
                  type="checkbox" 
                  name="retirement" 
                  id="retirement"
                  checked={selectedBenefits.retirement}
                  onChange={() => handleToggleBenefit('retirement')}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label 
                  htmlFor="retirement" 
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    selectedBenefits.retirement ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              </div>
            </label>
          </div>
          
          {selectedBenefits.retirement && (
            <div className="p-4">
              <div className="mb-4">
                <label htmlFor="contribution" className="block text-sm font-medium text-gray-700 mb-1">
                  Contribution Percentage (Company matches up to 3%)
                </label>
                <select
                  id="contribution"
                  name="contribution"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="1">1% of salary</option>
                  <option value="2">2% of salary</option>
                  <option value="3">3% of salary</option>
                  <option value="4">4% of salary</option>
                  <option value="5" defaultValue>5% of salary</option>
                  <option value="6">6% of salary</option>
                  <option value="7">7% of salary</option>
                  <option value="8">8% of salary</option>
                  <option value="9">9% of salary</option>
                  <option value="10">10% of salary</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 flex justify-end">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
        >
          Save Benefit Elections
        </button>
      </div>
      
      <style jsx>{`
        .toggle-checkbox:checked {
          right: 0;
          border-color: #fff;
        }
        .toggle-label {
          height: 24px;
          width: 40px;
        }
        .toggle-checkbox {
          height: 24px;
          width: 24px;
          right: 16px;
        }
      `}</style>
    </div>
  );
};

export default ManageBenefits; 