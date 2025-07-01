import React from 'react';

const CompanyProfile = ({ user, profileData, isOwner, isAdmin, notifySuccess, notifyError }) => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Profile</h2>
      <p className="text-gray-600 mb-6">
        View and update your company information.
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Company Name</label>
          <p className="mt-1 text-sm text-gray-900">{profileData?.businessName || 'Not set'}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1 text-sm text-gray-900">{user?.email || 'Not set'}</p>
        </div>
        
        <div className="pt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile;