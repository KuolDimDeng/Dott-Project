import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { axiosInstance } from '@/lib/axiosConfig';

const VerifyEmployee = () => {
  const { employeeId } = useParams();
  const [employeeData, setEmployeeData] = useState({});
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const response = await axiosInstance.get(`/api/employee/${employeeId}/`);
        setEmployeeData(response.data);
      } catch (error) {
        console.error('Error fetching employee data:', error);
      }
    };
    fetchEmployeeData();
  }, [employeeId]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setEmployeeData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVerifyToggle = () => {
    setVerified(!verified);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.put(`/api/employee/${employeeId}/`, employeeData);
      if (verified) {
        await axiosInstance.post(`/api/verify-and-onboard/${employeeId}/`);
      }
      console.log('Employee verified and onboarded');
      // Show success message or redirect
    } catch (error) {
      console.error('Error verifying employee:', error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        Verify Employee Information
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
            First Name
          </label>
          <input
            id="first_name"
            type="text"
            name="first_name"
            value={employeeData.first_name || ''}
            onChange={handleInputChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
          />
        </div>
        
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name
          </label>
          <input
            id="last_name"
            type="text"
            name="last_name"
            value={employeeData.last_name || ''}
            onChange={handleInputChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
          />
        </div>
        
        {/* Toggle Switch for Verify and Onboard */}
        <div className="flex items-center">
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input
              type="checkbox"
              id="toggle"
              checked={verified}
              onChange={handleVerifyToggle}
              className="opacity-0 absolute h-0 w-0"
            />
            <label
              htmlFor="toggle"
              className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                verified ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${
                  verified ? 'translate-x-4' : 'translate-x-0'
                }`}
              ></span>
            </label>
          </div>
          <span className="text-sm font-medium text-gray-700">Verify and Onboard</span>
        </div>
        
        <div className="pt-2">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {verified ? 'Verify and Onboard' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VerifyEmployee;
