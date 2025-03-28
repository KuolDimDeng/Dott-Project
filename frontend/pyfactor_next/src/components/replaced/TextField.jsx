'use client';

import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const TextField = forwardRef(({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  helperText,
  error = false,
  required = false,
  fullWidth = false,
  disabled = false,
  startAdornment,
  endAdornment,
  multiline = false,
  rows = 3,
  className = '',
  ...props
}, ref) => {
  const inputClasses = twMerge(
    'block w-full rounded-md py-2 px-3 text-sm transition-colors duration-200 focus:outline-none',
    error 
      ? 'border-error-main focus:border-error-main focus:ring-error-main/20' 
      : 'border-gray-300 dark:border-gray-600 focus:border-primary-main focus:ring-primary-main/20',
    disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-700',
    startAdornment ? 'pl-10' : '',
    endAdornment ? 'pr-10' : '',
    className
  );
  
  const renderInput = () => {
    if (multiline) {
      return (
        <textarea
          id={id}
          name={name}
          ref={ref}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          rows={rows}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className={inputClasses}
          {...props}
        />
      );
    }
    
    return (
      <input
        id={id}
        name={name}
        ref={ref}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className={inputClasses}
        {...props}
      />
    );
  };
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={id}
          className={twMerge(
            'block mb-1 text-sm font-medium',
            error ? 'text-error-main' : 'text-gray-700 dark:text-gray-200'
          )}
        >
          {label}
          {required && <span className="ml-1 text-error-main">*</span>}
        </label>
      )}
      
      <div className="relative">
        {startAdornment && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {startAdornment}
          </div>
        )}
        
        {renderInput()}
        
        {endAdornment && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {endAdornment}
          </div>
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

TextField.displayName = 'TextField';

export default TextField; 