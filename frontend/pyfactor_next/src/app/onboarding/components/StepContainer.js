'use client';

import React from 'react';
import PropTypes from 'prop-types';

/**
 * A container component for onboarding steps
 * Provides consistent layout and styling for all onboarding steps
 */
export const StepContainer = ({ 
  children, 
  className = '',
  fullWidth = false
}) => {
  return (
    <div className={`mx-auto ${fullWidth ? 'w-full' : 'max-w-4xl'} px-4 py-8 sm:px-6 lg:px-8 ${className}`}>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

StepContainer.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  fullWidth: PropTypes.bool
};

export default StepContainer; 