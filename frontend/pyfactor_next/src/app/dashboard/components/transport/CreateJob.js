'use client';

import React from 'react';
import { PlusCircleIcon } from '@heroicons/react/24/outline';

const CreateJob = () => {
  return (
    <div className="p-6">
      <div className="text-center">
        <PlusCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Transport Job</h1>
        <p className="text-gray-600 mb-6">Create a new delivery job with route planning and customer selection</p>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <p className="text-green-700">
            🚧 Job Creation feature coming soon! This will allow you to create delivery jobs with Google Maps route planning and multiple stops.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateJob;