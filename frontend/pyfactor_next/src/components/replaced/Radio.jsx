'use client';

import { forwardRef, createContext, useContext } from 'react';
import { twMerge } from 'tailwind-merge';

// Context for RadioGroup
const RadioGroupContext = createContext(null);

// Radio component
const Radio = forwardRef(({
  id,
  name,
  value,
  checked = false,
  onChange,
  onBlur,
  disabled = false,
  required = false,
  label,
  labelPlacement = 'end',
  size = 'medium',
  error = false,
  className = '',
  ...props
}, ref) => {
  // Get context from RadioGroup if available
  const radioGroup = useContext(RadioGroupContext);
  
  // If within a RadioGroup, use those props
  let radioProps = {
    name,
    onChange,
    checked,
    required,
  };
  
  if (radioGroup) {
    radioProps = {
      name: radioGroup.name,
      onChange: radioGroup.onChange,
      checked: radioGroup.value === value,
      required: radioGroup.required,
    };
  }
  
  const handleChange = (e) => {
    if (radioProps.onChange) {
      radioProps.onChange(e);
    }
  };

  // Size variants
  const sizeClasses = {
    small: 'w-3.5 h-3.5',
    medium: 'w-4 h-4',
    large: 'w-5 h-5',
  };

  const radioClasses = twMerge(
    'rounded-full border transition-colors focus:ring-offset-2 focus:ring-2 focus:ring-primary-main/50',
    sizeClasses[size] || sizeClasses.medium,
    radioProps.checked 
      ? 'border-primary-main' 
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

  const dotSize = {
    small: 'w-1.5 h-1.5',
    medium: 'w-2 h-2',
    large: 'w-2.5 h-2.5',
  };

  return (
    <div className={containerClasses}>
      <div className="relative flex items-center">
        <input
          type="radio"
          id={id}
          name={radioProps.name}
          value={value}
          ref={ref}
          checked={radioProps.checked}
          onChange={handleChange}
          onBlur={onBlur}
          disabled={disabled}
          required={radioProps.required}
          className="opacity-0 absolute h-full w-full cursor-pointer"
          {...props}
        />
        <div className={radioClasses}>
          {radioProps.checked && (
            <div className={twMerge(
              'rounded-full bg-primary-main m-auto',
              dotSize[size] || dotSize.medium
            )} />
          )}
        </div>
      </div>
      
      {label && (
        <label 
          htmlFor={id} 
          className={labelClasses}
        >
          {label}
          {radioProps.required && <span className="ml-1 text-error-main">*</span>}
        </label>
      )}
    </div>
  );
});

// RadioGroup component
const RadioGroup = forwardRef(({
  name,
  value,
  onChange,
  row = false,
  children,
  className = '',
  required = false,
  error = false,
  helperText,
  label,
  ...props
}, ref) => {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  const groupClasses = twMerge(
    row ? 'flex flex-row gap-4' : 'flex flex-col gap-2',
    className
  );

  return (
    <RadioGroupContext.Provider 
      value={{ name, onChange: handleChange, value, required }}
    >
      <div ref={ref} {...props}>
        {label && (
          <label className={twMerge(
            'block mb-2 text-sm font-medium',
            error ? 'text-error-main' : 'text-gray-700 dark:text-gray-200'
          )}>
            {label}
            {required && <span className="ml-1 text-error-main">*</span>}
          </label>
        )}
        
        <div className={groupClasses}>
          {children}
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
    </RadioGroupContext.Provider>
  );
});

Radio.displayName = 'Radio';
RadioGroup.displayName = 'RadioGroup';

export { Radio, RadioGroup }; 