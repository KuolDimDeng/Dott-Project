'use client';

import React from 'react';
import PropTypes from 'prop-types';

const StepHeader = ({ title, description, current_step, totalSteps, stepName }) => (
  <div className="text-center mb-6 w-full">
    <div className="text-gray-500 text-sm mb-2">
      Step {current_step} of {totalSteps} - {stepName}
    </div>
    <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
      {title}
    </h1>
    {description && (
      <p className="text-gray-600 dark:text-gray-300">
        {description}
      </p>
    )}
  </div>
);

// Add PropTypes for type checking
StepHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  current_step: PropTypes.number.isRequired,
  totalSteps: PropTypes.number.isRequired,
  stepName: PropTypes.string.isRequired
};

export default StepHeader;