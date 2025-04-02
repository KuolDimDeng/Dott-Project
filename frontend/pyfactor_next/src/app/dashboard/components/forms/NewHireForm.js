import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { axiosInstance } from '@/lib/axiosConfig';

const NewHireForm = () => {
  const { formId } = useParams();
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    social_security_number: '',
    bank_account_number: '',
    // Add other necessary fields
  });

  useEffect(() => {
    // Fetch preboarding form data
    const fetchPreboardingForm = async () => {
      try {
        const response = await axiosInstance.get(`/api/preboarding-form/${formId}/`);
        setFormData((prev) => ({
          ...prev,
          email: response.data.email,
          first_name: response.data.first_name,
          last_name: response.data.last_name,
        }));
      } catch (error) {
        console.error('Error fetching preboarding form:', error);
      }
    };
    fetchPreboardingForm();
  }, [formId]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/submit-new-hire-info/', formData);
      console.log('New hire info submitted:', response.data);
      // Show success message or redirect
    } catch (error) {
      console.error('Error submitting new hire info:', error);
    }
  };

  return (
    <div className="w-full">
      <h5 className="text-xl font-semibold mb-4">
        Complete Your Information
      </h5>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
            required
            disabled
          />
        </div>
        
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
            First Name
          </label>
          <input
            id="first_name"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name
          </label>
          <input
            id="last_name"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="social_security_number" className="block text-sm font-medium text-gray-700 mb-1">
            Social Security Number
          </label>
          <input
            id="social_security_number"
            name="social_security_number"
            value={formData.social_security_number}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="bank_account_number" className="block text-sm font-medium text-gray-700 mb-1">
            Bank Account Number
          </label>
          <input
            id="bank_account_number"
            name="bank_account_number"
            value={formData.bank_account_number}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        {/* Add other necessary fields */}
        
        <div className="pt-2">
          <button 
            type="submit" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Submit Information
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewHireForm;