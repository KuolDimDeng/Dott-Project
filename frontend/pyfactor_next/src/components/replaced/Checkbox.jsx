'use client';

import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const Checkbox = forwardRef(({
  id,
  name,
  checked = false,
  onChange,
  onBlur,
  disabled = false,
  required = false,
  label,
  labelPlacement = 'end',
  size = 'medium',
  error = false,
  helperText,
  className = '',
  ...props
}, ref) => {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  // Size variants
  const sizeClasses = {
    small: 'w-3.5 h-3.5',
    medium: 'w-4 h-4',
    large: 'w-5 h-5',
  };

  const checkboxClasses = twMerge(
    'rounded border transition-colors focus:ring-offset-2 focus:ring-2 focus:ring-primary-main/50',
    sizeClasses[size] || sizeClasses.medium,
    checked 
      ? 'bg-primary-main border-primary-main' 
      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600',
    error 
      ? 'border-error-main' 
      : '',
    disabled 
      ? 'opacity-50 cursor-not-allowed' 
      : 'cursor-pointer',
    className
  );

  const containerClasses = twMerge(
    'inline-flex items-center',
    labelPlacement === 'start' ? 'flex-row-reverse' : 'flex-row',
    labelPlacement === 'top' ? 'flex-col-reverse' : '',
    labelPlacement === 'bottom' ? 'flex-col' : ''
  );

  const labelClasses = twMerge(
    'text-sm font-medium text-gray-700 dark:text-gray-300',
    labelPlacement === 'start' ? 'mr-2' : '',
    labelPlacement === 'end' ? 'ml-2' : '',
    labelPlacement === 'top' ? 'mb-1' : '',
    labelPlacement === 'bottom' ? 'mt-1' : '',
    disabled ? 'opacity-50' : '',
    error ? 'text-error-main' : ''
  );

  const checkmarkSize = {
    small: 'h-2 w-2',
    medium: 'h-2.5 w-2.5',
    large: 'h-3 w-3',
  };

  return (
    <div>
      <div className={containerClasses}>
        <div className="relative flex items-center">
          <input
            type="checkbox"
            id={id}
            name={name}
            ref={ref}
            checked={checked}
            onChange={handleChange}
            onBlur={onBlur}
            disabled={disabled}
            required={required}
            className={twMerge('opacity-0 absolute h-full w-full cursor-pointer', disabled ? 'cursor-not-allowed' : '')}
            {...props}
          />
          <div className={checkboxClasses}>
            {checked && (
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={twMerge("text-white m-auto", checkmarkSize[size] || checkmarkSize.medium)} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        
        {label && (
          <label 
            htmlFor={id} 
            className={labelClasses}
          >
            {label}
            {required && <span className="ml-1 text-error-main">*</span>}
          </label>
        )}
      </div>
      
      {helperText && (
        <p className={twMerge(
          'mt-1 text-xs',
          error ? 'text-error-main' : 'text-gray-500 dark:text-gray-400'
        )}>
          {helperText}
        </p>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox; 