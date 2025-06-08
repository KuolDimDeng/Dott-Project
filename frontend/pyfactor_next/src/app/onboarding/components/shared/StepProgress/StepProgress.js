'use client';


import React from 'react';
import PropTypes from 'prop-types';
import { ONBOARDING_STEPS } from '@/config/steps';

const StepProgress = ({ steps, orientation = 'horizontal' }) => {
  // Check if we received the parsed steps array or if we should generate it
  const stepsArray = Array.isArray(steps) 
    ? steps 
    : Object.entries(ONBOARDING_STEPS)
        .filter(([key]) => key !== 'complete')
        .map(([key, config]) => ({
          key,
          label: config.title,
          description: config.description,
          step: config.step
        }))
        .sort((a, b) => a.step - b.step);

  const activeStep = steps.findIndex(step => step.current);

  return (
    <div className="w-full mb-8">
      <div className={`${orientation === 'vertical' ? 'flex flex-col space-y-8' : 'flex justify-between'}`}>
        {stepsArray.map((step, index) => (
          <div 
            key={step.key || index}
            className={`${orientation === 'vertical' ? 'flex items-center' : 'flex flex-col items-center'}`}
          >
            {/* Connector Line (only for horizontal layout) */}
            {orientation !== 'vertical' && index > 0 && (
              <div className="absolute h-0.5 bg-gray-200" style={{
                left: `${(index - 0.5) * (100 / stepsArray.length)}%`,
                right: `${100 - (index + 0.5) * (100 / stepsArray.length)}%`,
                top: '1.25rem'
              }}>
                <div 
                  className={`h-full ${index < activeStep ? 'bg-primary-main' : 'bg-gray-200'}`}
                />
              </div>
            )}
            
            {/* Step Circle */}
            <div 
              className={`
                relative z-10 flex items-center justify-center w-10 h-10 rounded-full 
                ${step.completed 
                  ? 'bg-green-500 text-white' 
                  : step.current 
                    ? 'bg-primary-main text-white ring-4 ring-primary-light' 
                    : 'bg-gray-200 text-gray-500'
                }
              `}
            >
              {step.completed ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            
            {/* Step Label */}
            <div className={`${orientation === 'vertical' ? 'ml-4' : 'mt-2'} text-center`}>
              <div 
                className={`
                  text-sm font-medium 
                  ${step.current ? 'text-primary-main font-semibold' : 'text-gray-500'}
                `}
              >
                {step.label}
              </div>
              
              {/* Description (only show for current step and on vertical layout) */}
              {(step.current || orientation === 'vertical') && step.description && (
                <div className="text-xs text-gray-500 mt-1">
                  {step.description}
                </div>
              )}
            </div>
            
            {/* Connector for vertical layout */}
            {orientation === 'vertical' && index < stepsArray.length - 1 && (
              <div className="absolute w-0.5 bg-gray-200 -left-5 top-10 h-8">
                <div 
                  className={`w-full h-full ${index < activeStep ? 'bg-primary-main' : 'bg-gray-200'}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

StepProgress.propTypes = {
  steps: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    label: PropTypes.string.isRequired,
    description: PropTypes.string,
    current: PropTypes.bool,
    completed: PropTypes.bool
  })).isRequired,
  orientation: PropTypes.oneOf(['horizontal', 'vertical'])
};

export default React.memo(StepProgress);