import { useMemoryOptimizer } from '@/utils/memoryManager';
import React, { useReducer, useMemo, memo } from 'react';
'use client';

// Tailwind UI components to replace MUI components
// Comprehensive set of components based on Tailwind CSS

import React, { useState, useEffect, Fragment } from 'react';
import NextLink from 'next/link';

// Re-export Next.js Link component with some additional styling
export const Link = ({ children, href, className = '', ...props }) => {
  return (
    <NextLink 
      href={href} 
      className={`text-primary-main hover:text-primary-dark hover:underline ${className}`}
      {...props}
    >
      {children}
    </NextLink>
  );
};

export const Button = ({ 
  children, 
  onClick, 
  variant = 'contained', 
  color = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  startIcon = null,
  endIcon = null,
  type = 'button',
  className = '',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
  
  // Size classes
  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  };
  
  // Color and variant classes
  const variantClasses = {
    contained: {
      primary: 'bg-primary-main hover:bg-primary-dark text-white focus:ring-primary-light',
      secondary: 'bg-secondary-main hover:bg-secondary-dark text-white focus:ring-secondary-light',
      error: 'bg-error-main hover:bg-error-dark text-white focus:ring-error-light',
      warning: 'bg-warning-main hover:bg-warning-dark text-white focus:ring-warning-light',
      info: 'bg-info-main hover:bg-info-dark text-white focus:ring-info-light',
      success: 'bg-success-main hover:bg-success-dark text-white focus:ring-success-light',
    },
    outlined: {
      primary: 'border border-primary-main text-primary-main hover:bg-primary-main/5 focus:ring-primary-light',
      secondary: 'border border-secondary-main text-secondary-main hover:bg-secondary-main/5 focus:ring-secondary-light',
      error: 'border border-error-main text-error-main hover:bg-error-main/5 focus:ring-error-light',
      warning: 'border border-warning-main text-warning-main hover:bg-warning-main/5 focus:ring-warning-light',
      info: 'border border-info-main text-info-main hover:bg-info-main/5 focus:ring-info-light',
      success: 'border border-success-main text-success-main hover:bg-success-main/5 focus:ring-success-light',
    },
    text: {
      primary: 'text-primary-main hover:bg-primary-main/5 focus:ring-primary-light',
      secondary: 'text-secondary-main hover:bg-secondary-main/5 focus:ring-secondary-light',
      error: 'text-error-main hover:bg-error-main/5 focus:ring-error-light',
      warning: 'text-warning-main hover:bg-warning-main/5 focus:ring-warning-light',
      info: 'text-info-main hover:bg-info-main/5 focus:ring-info-light',
      success: 'text-success-main hover:bg-success-main/5 focus:ring-success-light',
    }
  };
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
  const widthClasses = fullWidth ? 'w-full' : '';
  
  const colorVariantClass = variantClasses[variant]?.[color] || variantClasses.contained.primary;
  const sizeClass = sizeClasses[size] || sizeClasses.medium;
  
  return (
    <button
      type={type}
      className={`${baseClasses} ${colorVariantClass} ${sizeClass} ${widthClasses} ${disabledClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {startIcon && <span className="mr-2">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-2">{endIcon}</span>}
    </button>
  );
};

export const TextField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error = false,
  helperText = '',
  fullWidth = true,
  required = false,
  disabled = false,
  placeholder = '',
  className = '',
  inputProps = {},
  ...props
}) => {
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label 
          htmlFor={name} 
          className={`block text-sm font-medium mb-1 ${error ? 'text-error-main' : 'text-gray-700'}`}
        >
          {label}{required && <span className="text-error-main ml-1">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-1 
          ${error 
            ? 'border-error-main focus:border-error-main focus:ring-error-light' 
            : 'border-gray-300 focus:border-primary-main focus:ring-primary-light'
          } 
          ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
        `}
        {...inputProps}
        {...props}
      />
      {helperText && (
        <p className={`mt-1 text-sm ${error ? 'text-error-main' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
};

export const Alert = ({
  severity = 'info',
  children,
  onClose,
  className = '',
  ...props
}) => {
  const severityClasses = {
    error: 'bg-red-50 text-error-main border-error-light',
    warning: 'bg-yellow-50 text-warning-main border-warning-light',
    info: 'bg-blue-50 text-info-main border-info-light',
    success: 'bg-green-50 text-success-main border-success-light'
  };
  
  const severityClass = severityClasses[severity] || severityClasses.info;
  
  return (
    <div 
      className={`rounded-md p-4 border ${severityClass} ${className}`}
      role="alert"
      {...props}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          {severity === 'error' && (
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {severity === 'warning' && (
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {severity === 'info' && (
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
          {severity === 'success' && (
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3">
          <div className="text-sm">{children}</div>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  severity === 'error' ? 'text-red-500 hover:bg-red-100 focus:ring-red-600' :
                  severity === 'warning' ? 'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600' :
                  severity === 'info' ? 'text-blue-500 hover:bg-blue-100 focus:ring-blue-600' :
                  'text-green-500 hover:bg-green-100 focus:ring-green-600'
                }`}
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const CircularProgress = ({
  size = 'medium',
  color = 'primary',
  className = '',
  ...props
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };
  
  const colorClasses = {
    primary: 'text-primary-main',
    secondary: 'text-secondary-main',
    info: 'text-info-main',
    success: 'text-success-main',
    warning: 'text-warning-main',
    error: 'text-error-main'
  };
  
  const sizeClass = sizeClasses[size] || sizeClasses.medium;
  const colorClass = colorClasses[color] || colorClasses.primary;
  
  return (
    <svg 
      className={`animate-spin ${sizeClass} ${colorClass} ${className}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
      {...props}
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export const Paper = ({
  children,
  elevation = 1,
  className = '',
  ...props
}) => {
  const elevationClasses = {
    0: 'shadow-none',
    1: 'shadow-sm',
    2: 'shadow',
    3: 'shadow-md',
    4: 'shadow-lg',
    5: 'shadow-xl',
    6: 'shadow-2xl'
  };
  
  const shadowClass = elevationClasses[elevation] || elevationClasses[1];
  
  return (
    <div 
      className={`bg-white rounded-md ${shadowClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const Card = ({
  children,
  elevation = 1,
  className = '',
  ...props
}) => {
  const elevationClasses = {
    0: 'shadow-none',
    1: 'shadow-sm',
    2: 'shadow',
    3: 'shadow-md',
    4: 'shadow-lg',
    5: 'shadow-xl',
    6: 'shadow-2xl'
  };
  
  const shadowClass = elevationClasses[elevation] || elevationClasses[1];
  
  return (
    <div 
      className={`bg-white rounded-lg overflow-hidden ${shadowClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardContent = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div 
      className={`p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardActions = ({
  children,
  className = '',
  disableSpacing = false,
  ...props
}) => {
  return (
    <div 
      className={`px-4 py-3 ${!disableSpacing ? 'flex items-center' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const Container = ({
  children,
  maxWidth = 'lg',
  className = '',
  ...props
}) => {
  const maxWidthClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
    none: ''
  };

  const maxWidthClass = maxWidthClasses[maxWidth] || maxWidthClasses.lg;

  return (
    <div
      className={`mx-auto px-4 sm:px-6 ${maxWidthClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const Box = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div 
      className={className}
      {...props}
    >
      {children}
    </div>
  );
};

export const Grid = ({
  children,
  container = false,
  item = false,
  spacing = 0,
  xs, sm, md, lg, xl,
  justifyContent = '',
  alignItems = '',
  direction = '',
  wrap = '',
  className = '',
  ...props
}) => {
  // Column size classes
  const getColClasses = () => {
    const colClasses = [];
    
    if (xs) colClasses.push(`col-span-${xs}`);
    if (sm) colClasses.push(`sm:col-span-${sm}`);
    if (md) colClasses.push(`md:col-span-${md}`);
    if (lg) colClasses.push(`lg:col-span-${lg}`);
    if (xl) colClasses.push(`xl:col-span-${xl}`);
    
    return colClasses.join(' ');
  };
  
  // Spacing classes (gap)
  const spacingClasses = {
    0: 'gap-0',
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
    8: 'gap-8',
    10: 'gap-10',
    12: 'gap-12',
  };
  
  // Alignment classes
  const justifyClasses = {
    'flex-start': 'justify-start',
    'center': 'justify-center',
    'flex-end': 'justify-end',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
    'space-evenly': 'justify-evenly'
  };
  
  const alignClasses = {
    'flex-start': 'items-start',
    'center': 'items-center',
    'flex-end': 'items-end',
    'stretch': 'items-stretch',
    'baseline': 'items-baseline'
  };
  
  const directionClasses = {
    'row': 'flex-row',
    'column': 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'column-reverse': 'flex-col-reverse'
  };
  
  const wrapClasses = {
    'nowrap': 'flex-nowrap',
    'wrap': 'flex-wrap',
    'wrap-reverse': 'flex-wrap-reverse'
  };
  
  const spacingClass = spacingClasses[spacing] || spacingClasses[0];
  const justifyClass = justifyContent ? justifyClasses[justifyContent] || '' : '';
  const alignClass = alignItems ? alignClasses[alignItems] || '' : '';
  const directionClass = direction ? directionClasses[direction] || '' : '';
  const wrapClass = wrap ? wrapClasses[wrap] || '' : '';
  
  if (container) {
    return (
      <div 
        className={`grid grid-cols-12 ${spacingClass} ${justifyClass} ${alignClass} ${directionClass} ${wrapClass} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
  
  if (item) {
    return (
      <div 
        className={`${getColClasses()} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
  
  // Default to regular div if neither container nor item
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
};

export const Flex = ({
  children,
  direction = 'row',
  justifyContent = 'flex-start',
  alignItems = 'stretch',
  wrap = 'nowrap',
  gap = 0,
  className = '',
  ...props
}) => {
  const directionClasses = {
    'row': 'flex-row',
    'column': 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'column-reverse': 'flex-col-reverse'
  };
  
  const justifyClasses = {
    'flex-start': 'justify-start',
    'center': 'justify-center',
    'flex-end': 'justify-end',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
    'space-evenly': 'justify-evenly'
  };
  
  const alignClasses = {
    'flex-start': 'items-start',
    'center': 'items-center',
    'flex-end': 'items-end',
    'stretch': 'items-stretch',
    'baseline': 'items-baseline'
  };
  
  const wrapClasses = {
    'nowrap': 'flex-nowrap',
    'wrap': 'flex-wrap',
    'wrap-reverse': 'flex-wrap-reverse'
  };
  
  const gapClasses = {
    0: 'gap-0',
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
    8: 'gap-8',
    10: 'gap-10',
    12: 'gap-12',
  };
  
  const directionClass = directionClasses[direction] || 'flex-row';
  const justifyClass = justifyClasses[justifyContent] || 'justify-start';
  const alignClass = alignClasses[alignItems] || 'items-stretch';
  const wrapClass = wrapClasses[wrap] || 'flex-nowrap';
  const gapClass = gapClasses[gap] || 'gap-0';
  
  return (
    <div 
      className={`flex ${directionClass} ${justifyClass} ${alignClass} ${wrapClass} ${gapClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const Typography = ({
  children,
  variant = 'body1',
  component,
  color = 'inherit',
  className = '',
  gutterBottom = false,
  ...props
}) => {
  const variantClasses = {
    h1: 'text-4xl font-bold',
    h2: 'text-3xl font-bold',
    h3: 'text-2xl font-bold',
    h4: 'text-xl font-bold',
    h5: 'text-lg font-bold',
    h6: 'text-base font-bold',
    subtitle1: 'text-base font-medium',
    subtitle2: 'text-sm font-medium',
    body1: 'text-base',
    body2: 'text-sm',
    caption: 'text-xs',
    button: 'text-base font-medium',
    overline: 'text-xs uppercase tracking-wider'
  };
  
  const colorClasses = {
    inherit: '',
    primary: 'text-primary-main',
    secondary: 'text-secondary-main',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    error: 'text-error-main',
    warning: 'text-warning-main',
    info: 'text-info-main',
    success: 'text-success-main'
  };
  
  const variantClass = variantClasses[variant] || variantClasses.body1;
  const colorClass = colorClasses[color] || '';
  const gutterBottomClass = gutterBottom ? 'mb-4' : '';
  
  const Component = component || 
    (variant === 'h1' ? 'h1' :
    variant === 'h2' ? 'h2' :
    variant === 'h3' ? 'h3' :
    variant === 'h4' ? 'h4' :
    variant === 'h5' ? 'h5' :
    variant === 'h6' ? 'h6' : 'p');
  
  // Remove gutterBottom from props before passing to DOM element
  const { gutterBottom: _, ...domProps } = props;
  
  return (
    <Component 
      className={`${variantClass} ${colorClass} ${gutterBottomClass} ${className}`}
      {...domProps}
    >
      {children}
    </Component>
  );
};

export const Divider = ({
  orientation = 'horizontal',
  className = '',
  ...props
}) => {
  return orientation === 'vertical' ? (
    <div 
      className={`h-full w-px bg-gray-200 ${className}`}
      {...props}
    />
  ) : (
    <div 
      className={`h-px w-full bg-gray-200 ${className}`}
      {...props}
    />
  );
};

export const Avatar = ({ 
  src, 
  alt, 
  children, 
  size = 'medium',
  variant = 'circle',
  className = '',
  ...props 
}) => {
  const sizeClasses = {
    small: 'h-8 w-8 text-xs',
    medium: 'h-10 w-10 text-sm',
    large: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg'
  };
  
  const variantClasses = {
    circle: 'rounded-full',
    rounded: 'rounded-md',
    square: 'rounded-none'
  };
  
  const sizeClass = sizeClasses[size] || sizeClasses.medium;
  const variantClass = variantClasses[variant] || variantClasses.circle;
  
  if (src) {
    return (
      <div 
        className={`${sizeClass} ${variantClass} overflow-hidden bg-gray-100 flex items-center justify-center ${className}`}
        {...props}
      >
        <img
          src={src}
          alt={alt || ''}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  
  return (
    <div 
      className={`${sizeClass} ${variantClass} bg-primary-main text-white flex items-center justify-center font-medium ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const Badge = ({
  children,
  badgeContent,
  color = 'primary',
  overlap = 'rectangular',
  variant = 'standard',
  showZero = false,
  max = 99,
  className = '',
  ...props
}) => {
  // If badgeContent is 0 and showZero is false, don't display badge
  if (badgeContent === 0 && !showZero) {
    return <>{children}</>;
  }
  
  const displayContent = badgeContent > max ? `${max}+` : badgeContent;
  
  const colorClasses = {
    primary: 'bg-primary-main text-white',
    secondary: 'bg-secondary-main text-white',
    error: 'bg-error-main text-white',
    warning: 'bg-warning-main text-white',
    info: 'bg-info-main text-white',
    success: 'bg-success-main text-white'
  };
  
  const variantClasses = {
    standard: colorClasses[color] || colorClasses.primary,
    dot: `${colorClasses[color] || colorClasses.primary} h-2 w-2 rounded-full p-0 flex items-center justify-center`
  };
  
  return (
    <div className="relative inline-flex">
      {children}
      <div 
        className={`absolute -top-1 -right-1 z-10 ${
          variant === 'dot' ? 'min-w-0' : 'min-w-[20px] h-5 px-1'
        } ${
          variantClasses[variant] || variantClasses.standard
        } rounded-full text-xs flex items-center justify-center ${className}`}
        {...props}
      >
        {variant !== 'dot' && displayContent}
      </div>
    </div>
  );
};

export const Menu = ({
  anchorEl,
  open,
  onClose,
  children,
  className = '',
  ...props
}) => {
  if (!open) return null;
  
  // Create a reference to detect clicks outside of modal
  const menuRef = React.useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  // Calculate position if anchorEl is provided
  let style = {};
  
  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    style = {
      top: `${rect.bottom}px`,
      left: `${rect.left}px`
    };
  }
  
  return (
    <div 
      ref={menuRef}
      className={`absolute z-50 mt-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none ${className}`}
      style={style}
      {...props}
    >
      <div className="py-1">
        {children}
      </div>
    </div>
  );
};

export const MenuItem = ({
  children,
  onClick,
  disabled = false,
  className = '',
  ...props
}) => {
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100';
  
  return (
    <div
      className={`px-4 py-2 text-sm text-gray-700 ${disabledClass} ${className}`}
      onClick={disabled ? undefined : onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export const Popover = ({
  anchorEl,
  open,
  onClose,
  children,
  anchorOrigin = { vertical: 'bottom', horizontal: 'center' },
  transformOrigin = { vertical: 'top', horizontal: 'center' },
  className = '',
  ...props
}) => {
  if (!open || !anchorEl) return null;
  
  // Create a reference to detect clicks outside of popover
  const popoverRef = React.useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  // Calculate position based on anchorOrigin and transformOrigin
  const rect = anchorEl.getBoundingClientRect();
  
  let top, left;
  
  // Calculate vertical position
  if (anchorOrigin.vertical === 'top' && transformOrigin.vertical === 'bottom') {
    top = rect.top - 8; // slight offset
  } else if (anchorOrigin.vertical === 'bottom' && transformOrigin.vertical === 'top') {
    top = rect.bottom + 8; // slight offset
  } else if (anchorOrigin.vertical === 'center' && transformOrigin.vertical === 'center') {
    top = rect.top + rect.height / 2;
  } else if (anchorOrigin.vertical === 'top' && transformOrigin.vertical === 'top') {
    top = rect.top;
  } else if (anchorOrigin.vertical === 'bottom' && transformOrigin.vertical === 'bottom') {
    top = rect.bottom;
  } else {
    top = rect.bottom + 8;
  }
  
  // Calculate horizontal position
  if (anchorOrigin.horizontal === 'left' && transformOrigin.horizontal === 'right') {
    left = rect.left - 8; // slight offset
  } else if (anchorOrigin.horizontal === 'right' && transformOrigin.horizontal === 'left') {
    left = rect.right + 8; // slight offset
  } else if (anchorOrigin.horizontal === 'center' && transformOrigin.horizontal === 'center') {
    left = rect.left + rect.width / 2;
  } else if (anchorOrigin.horizontal === 'left' && transformOrigin.horizontal === 'left') {
    left = rect.left;
  } else if (anchorOrigin.horizontal === 'right' && transformOrigin.horizontal === 'right') {
    left = rect.right;
  } else {
    left = rect.left;
  }
  
  return (
    <div 
      ref={popoverRef}
      className={`absolute z-50 rounded-md shadow-lg bg-white focus:outline-none ${className}`}
      style={{ top: `${top}px`, left: `${left}px` }}
      {...props}
    >
      {children}
    </div>
  );
};

export const Select = ({
  children,
  label,
  name,
  value,
  onChange,
  error = false,
  helperText = '',
  fullWidth = true,
  required = false,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label 
          htmlFor={name} 
          className={`block text-sm font-medium mb-1 ${error ? 'text-error-main' : 'text-gray-700'}`}
        >
          {label}{required && <span className="text-error-main ml-1">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-1 
          ${error 
            ? 'border-error-main focus:border-error-main focus:ring-error-light' 
            : 'border-gray-300 focus:border-primary-main focus:ring-primary-light'
          } 
          ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
        `}
        {...props}
      >
        {children}
      </select>
      {helperText && (
        <p className={`mt-1 text-sm ${error ? 'text-error-main' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
};

export const FormControl = ({
  children,
  fullWidth = true,
  className = '',
  ...props
}) => {
  return (
    <div 
      className={`${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const RadioGroup = ({
  children,
  name,
  value,
  onChange,
  className = '',
  ...props
}) => {
  return (
    <div 
      className={`space-y-2 ${className}`}
      {...props}
    >
      {(React.Children || []).map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          name,
          checked: child.props.value === value,
          onChange
        });
      })}
    </div>
  );
};

export const Radio = ({
  checked,
  onChange,
  name,
  value,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={`h-4 w-4 border-gray-300 text-primary-main focus:ring-primary-light ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      {...props}
    />
  );
};

export const FormControlLabel = ({
  control,
  label,
  className = '',
  ...props
}) => {
  return (
    <label 
      className={`inline-flex items-center ${className}`}
      {...props}
    >
      {React.cloneElement(control, {
        ...control.props,
        className: `${control.props.className || ''} mr-2`
      })}
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
};

export const Tabs = ({ 
  children, 
  value, 
  onChange, 
  variant = 'standard', 
  className = '', 
  ...props 
}) => {
  return (
    <div 
      className={`border-b border-gray-200 ${className}`}
      {...props}
    >
      <div className="-mb-px flex space-x-8">
        {(React.Children || []).map(children, (child, index) => {
          if (!React.isValidElement(child)) return child;
          
          const isSelected = child.props.value === value;
          
          return React.cloneElement(child, {
            selected: isSelected,
            onChange,
            ...child.props
          });
        })}
      </div>
    </div>
  );
};

export const Tab = ({ 
  label, 
  value, 
  selected, 
  onChange,
  disabled = false, 
  className = '', 
  ...props 
}) => {
  const baseClasses = "py-2 px-1 text-sm font-medium border-b-2 whitespace-nowrap";
  
  const selectedClasses = selected 
    ? "border-primary-main text-primary-main"
    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";
  
  const disabledClasses = disabled 
    ? "opacity-50 cursor-not-allowed" 
    : "cursor-pointer";

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${baseClasses} ${selectedClasses} ${disabledClasses} ${className}`}
      onClick={(e) => !disabled && onChange && onChange(e, value)}
      {...props}
    >
      {label}
    </button>
  );
};

export const Checkbox = ({
  checked,
  onChange,
  name,
  label,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`h-4 w-4 rounded border-gray-300 text-primary-main focus:ring-primary-light ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        {...props}
      />
      {label && (
        <label
          htmlFor={name}
          className={`ml-2 block text-sm text-gray-700 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export const LoadingButton = ({
  children,
  loading = false,
  loadingIndicator = null,
  ...props
}) => {
  return (
    <Button
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <>
          {loadingIndicator || <CircularProgress size="small" className="mr-2" />}
          {children}
        </>
      ) : children}
    </Button>
  );
};

export const ToggleButtonGroup = ({
  children,
  value,
  onChange,
  exclusive = false,
  className = '',
  ...props
}) => {
  return (
    <div 
      className={`inline-flex rounded-md shadow-sm ${className}`}
      role="group"
      {...props}
    >
      {(React.Children || []).map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        
        // For exclusive mode (radio-like behavior)
        if (exclusive) {
          const isSelected = child.props.value === value;
          
          return React.cloneElement(child, {
            selected: isSelected,
            onClick: (e) => {
              if (onChange) {
                onChange(e, child.props.value);
              }
              if (child.props.onClick) {
                child.props.onClick(e);
              }
            }
          });
        }
        
        // For multiple selection (checkbox-like behavior)
        const isSelected = Array.isArray(value) && value.includes(child.props.value);
        
        return React.cloneElement(child, {
          selected: isSelected,
          onClick: (e) => {
            if (onChange) {
              let newValue;
              if (isSelected) {
                newValue = value.filter((v) => v !== child.props.value);
              } else {
                newValue = [...value, child.props.value];
              }
              onChange(e, newValue);
            }
            if (child.props.onClick) {
              child.props.onClick(e);
            }
          }
        });
      })}
    </div>
  );
};

export const ToggleButton = ({
  children,
  value,
  selected = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const baseClasses = "relative inline-flex items-center px-4 py-2 text-sm font-medium focus:z-10 focus:outline-none";
  
  const selectedClasses = selected 
    ? "bg-primary-main text-white hover:bg-primary-dark"
    : "bg-white text-gray-700 hover:bg-gray-50";
  
  const disabledClasses = disabled 
    ? "opacity-50 cursor-not-allowed" 
    : "cursor-pointer";
    
  const borderClasses = "border border-gray-300";
  
  return (
    <button
      type="button"
      disabled={disabled}
      className={`${baseClasses} ${selectedClasses} ${disabledClasses} ${borderClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Collapse = ({
  in: open,
  children,
  timeout = 300,
  className = '',
  ...props
}) => {
  const [height, setHeight] = useState(open ? 'auto' : '0');
  const [visibility, setVisibility] = useState(open ? 'visible' : 'hidden');
  const ref = React.useRef(null);
  
  useEffect(() => {
    if (open) {
      setVisibility('visible');
      setTimeout(() => {
        const contentHeight = ref.current ? ref.current.scrollHeight : 'auto';
        setHeight(`${contentHeight}px`);
        setTimeout(() => {
          setHeight('auto');
        }, timeout);
      }, 10);
    } else {
      const contentHeight = ref.current ? ref.current.scrollHeight : 'auto';
      setHeight(`${contentHeight}px`);
      setTimeout(() => {
        setHeight('0');
        setTimeout(() => {
          setVisibility('hidden');
        }, timeout);
      }, 10);
    }
  }, [open, timeout]);
  
  return (
    <div
      ref={ref}
      className={`overflow-hidden transition-all ${className}`}
      style={{ 
        height, 
        visibility,
        transitionDuration: `${timeout}ms`
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const Fade = ({
  in: open,
  children,
  timeout = 300,
  className = '',
  ...props
}) => {
  const [opacity, setOpacity] = useState(open ? 1 : 0);
  const [visibility, setVisibility] = useState(open ? 'visible' : 'hidden');
  
  useEffect(() => {
    if (open) {
      setVisibility('visible');
      setTimeout(() => {
        setOpacity(1);
      }, 10);
    } else {
      setOpacity(0);
      setTimeout(() => {
        setVisibility('hidden');
      }, timeout);
    }
  }, [open, timeout]);
  
  return (
    <div
      className={`transition-opacity ${className}`}
      style={{ 
        opacity, 
        visibility,
        transitionDuration: `${timeout}ms`
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const Backdrop = ({
  open,
  onClick,
  className = '',
  ...props
}) => {
  if (!open) return null;
  
  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40 ${className}`}
      onClick={onClick}
      {...props}
    />
  );
};

export const Tooltip = ({
  children,
  title,
  placement = 'bottom',
  className = '',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = React.useRef(null);
  
  // Calculate position based on placement
  const getPosition = () => {
    if (!ref.current) return {};
    
    const rect = ref.current.getBoundingClientRect();
    
    switch (placement) {
      case 'top':
        return { 
          top: `${rect.top - 8}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translate(-50%, -100%)'
        };
      case 'bottom':
        return { 
          top: `${rect.bottom + 8}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translate(-50%, 0)'
        };
      case 'left':
        return { 
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.left - 8}px`,
          transform: 'translate(-100%, -50%)'
        };
      case 'right':
        return { 
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + 8}px`,
          transform: 'translate(0, -50%)'
        };
      default:
        return { 
          top: `${rect.bottom + 8}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translate(-50%, 0)'
        };
    }
  };
  
  return (
    <>
      <div
        ref={ref}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={`inline-flex ${className}`}
        {...props}
      >
        {children}
      </div>
      
      {isOpen && title && (
        <div
          className="absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-sm pointer-events-none"
          style={getPosition()}
        >
          {title}
        </div>
      )}
    </>
  );
};

export const IconButton = ({
  children,
  onClick,
  color = 'default',
  size = 'medium',
  disabled = false,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    small: 'p-1',
    medium: 'p-2',
    large: 'p-3'
  };
  
  const colorClasses = {
    default: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
    primary: 'text-primary-main hover:bg-primary-main/10',
    secondary: 'text-secondary-main hover:bg-secondary-main/10',
    error: 'text-error-main hover:bg-error-main/10',
    warning: 'text-warning-main hover:bg-warning-main/10',
    info: 'text-info-main hover:bg-info-main/10',
    success: 'text-success-main hover:bg-success-main/10'
  };
  
  const sizeClass = sizeClasses[size] || sizeClasses.medium;
  const colorClass = colorClasses[color] || colorClasses.default;
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-full focus:outline-none ${sizeClass} ${colorClass} ${disabledClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// Commonly used svg icons
export const Icons = {
  Menu: (props) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      className="h-6 w-6"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: (props) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      className="h-6 w-6"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Notification: (props) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      className="h-6 w-6"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  User: (props) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      className="h-6 w-6"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Settings: (props) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      className="h-6 w-6"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Help: (props) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      className="h-6 w-6"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Logout: (props) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      className="h-6 w-6"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  ArrowDown: (props) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      className="h-6 w-6"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  ArrowUp: (props) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      className="h-6 w-6"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ),
  Home: (props) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      className="h-6 w-6"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
};

// Add Snackbar component for notifications
export const Snackbar = ({
  open,
  message,
  severity = 'info',
  autoHideDuration = 5000,
  onClose,
  anchorOrigin = { vertical: 'bottom', horizontal: 'left' },
  className = '',
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(open);
  
  useEffect(() => {
    setIsVisible(open);
    
    let timer;
    if (open && autoHideDuration) {
      timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, autoHideDuration);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [open, autoHideDuration, onClose]);
  
  if (!isVisible) return null;
  
  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4'
  };
  
  // Calculate position class from anchorOrigin
  const positionKey = `${anchorOrigin.vertical}-${anchorOrigin.horizontal}`;
  const positionClass = positionClasses[positionKey] || positionClasses['bottom-left'];
  
  // Severity classes for different alert types
  const severityClasses = {
    error: 'bg-error-main text-white',
    warning: 'bg-warning-main text-gray-900',
    info: 'bg-info-main text-white',
    success: 'bg-success-main text-white'
  };
  
  const severityClass = severityClasses[severity] || severityClasses.info;
  
  return (
    <div 
      className={`fixed z-1000 ${positionClass} transform transition-transform duration-300 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'} ${className}`}
      {...props}
    >
      <div className={`rounded-md shadow-lg px-4 py-3 flex items-center ${severityClass}`}>
        {/* Icons based on severity */}
        {severity === 'error' && (
          <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )}
        {severity === 'warning' && (
          <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )}
        {severity === 'info' && (
          <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )}
        {severity === 'success' && (
          <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
        <div>{message}</div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-4 text-white opacity-70 hover:opacity-100 focus:outline-none"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export const Switch = ({
  checked = false,
  onChange,
  label,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <label className="inline-flex items-center cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          <div className={`block w-10 h-6 rounded-full ${checked ? 'bg-primary-main' : 'bg-gray-300'} ${disabled ? 'opacity-50' : ''}`}></div>
          <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`}></div>
        </div>
        {label && <span className="ml-3 text-sm font-medium text-gray-700">{label}</span>}
      </label>
    </div>
  );
};

// Adding Dialog component
export const Dialog = ({
  open = false,
  onClose,
  children,
  title,
  maxWidth = 'sm',
  fullWidth = false,
  className = '',
  ...props
}) => {
  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose(e);
    }
  };

  const maxWidthClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const maxWidthClass = maxWidthClasses[maxWidth] || maxWidthClasses.sm;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={handleBackdropClick}
      {...props}
    >
      <div 
        className={`bg-white rounded-lg shadow-xl ${widthClass} ${maxWidthClass} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">{title}</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className={!title ? 'p-6' : 'px-6 py-4'}>
          {children}
        </div>
      </div>
    </div>
  );
};