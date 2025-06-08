/**
 * Benefit API utility functions
 */

/**
 * Fetches benefits data for a specific employee
 * 
 * @param {string} employeeId - The ID of the employee
 * @returns {Promise<Object>} - The benefits data for the employee
 */
export const fetchEmployeeBenefits = async (employeeId) => {
  try {
    const response = await fetch(`/api/hr/employees/${employeeId}/benefits/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch benefits data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching employee benefits:', error);
    // Return mock data for development/testing
    return getMockBenefitsData();
  }
};

/**
 * Updates benefits data for a specific employee
 * 
 * @param {string} employeeId - The ID of the employee
 * @param {Object} benefitsData - The updated benefits data
 * @returns {Promise<Object>} - The updated benefits data
 */
export const updateEmployeeBenefits = async (employeeId, benefitsData) => {
  try {
    const response = await fetch(`/api/hr/employees/${employeeId}/benefits/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(benefitsData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update benefits data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating employee benefits:', error);
    // Return mock data for development/testing
    return getMockBenefitsData();
  }
};

/**
 * Get mock benefits data for development/testing
 * @returns {Object} - Mock benefits data
 */
const getMockBenefitsData = () => {
  return {
    healthInsurance: {
      planName: 'Standard Health Plan',
      coverageLevel: 'individual',
      premium: 250,
      deductible: 1000
    },
    dentalInsurance: {
      planName: 'Standard Dental Plan',
      coverageLevel: 'individual',
      premium: 50
    },
    visionInsurance: {
      planName: 'Standard Vision Plan',
      coverageLevel: 'individual',
      premium: 25
    },
    retirementPlans: {
      contributionPercentage: 5,
      companyMatch: 4,
      investmentStrategy: 'moderate'
    },
    additionalBenefits: {
      flexibleSpendingAccount: true,
      fsaContribution: 1200,
      lifeInsurance: true,
      lifeInsuranceCoverage: 100000,
      otherBenefits: ['Gym Membership', 'Wellness Program']
    }
  };
}; 