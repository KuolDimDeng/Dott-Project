import React from 'react';

// Box Component (like MUI Box)
export const Box = ({ children, className = '', sx, component = 'div', ...props }) => {
  const Component = component;
  return (
    <Component 
      className={`${className}`} 
      style={sx}
      {...props}
    >
      {children}
    </Component>
  );
};

// Container Component
export const Container = ({ children, className = '', maxWidth = 'lg', ...props }) => {
  const maxWidthClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm', 
    md: 'max-w-md',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };
  
  return (
    <div 
      className={`mx-auto px-4 ${maxWidthClasses[maxWidth] || 'max-w-4xl'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Typography Component
export const Typography = ({ 
  children, 
  variant = 'body1', 
  className = '',
  component,
  color = 'inherit',
  ...props 
}) => {
  const variants = {
    h1: 'text-4xl font-bold',
    h2: 'text-3xl font-bold', 
    h3: 'text-2xl font-bold',
    h4: 'text-xl font-bold',
    h5: 'text-lg font-bold',
    h6: 'text-base font-bold',
    subtitle1: 'text-lg',
    subtitle2: 'text-base',
    body1: 'text-base',
    body2: 'text-sm',
    caption: 'text-xs',
    overline: 'text-xs uppercase tracking-wider'
  };

  const colors = {
    inherit: '',
    primary: 'text-blue-600',
    secondary: 'text-gray-600', 
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    error: 'text-red-600'
  };

  const Component = component || (variant.startsWith('h') ? variant : 'p');
  
  return (
    <Component 
      className={`${variants[variant] || variants.body1} ${colors[color]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

// Alert Component
export const Alert = ({ children, severity = 'info', className = '', ...props }) => {
  const severityClasses = {
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-green-50 text-green-700 border-green-200'
  };
  
  return (
    <div 
      className={`p-4 rounded-md border ${severityClasses[severity]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Button Component
export const Button = ({ 
  children, 
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  disabled = false,
  className = '',
  ...props 
}) => {
  const baseClasses = 'font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    contained: 'shadow-sm',
    outlined: 'border-2 bg-transparent',
    text: 'bg-transparent shadow-none'
  };
  
  const colors = {
    primary: variant === 'contained' 
      ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' 
      : variant === 'outlined'
      ? 'border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500'
      : 'text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
    secondary: variant === 'contained'
      ? 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500'
      : variant === 'outlined'
      ? 'border-gray-600 text-gray-600 hover:bg-gray-50 focus:ring-gray-500'
      : 'text-gray-600 hover:bg-gray-50 focus:ring-gray-500'
  };
  
  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-sm', 
    large: 'px-6 py-3 text-base'
  };
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${colors[color]} ${sizes[size]} ${disabledClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// TextField Component  
export const TextField = ({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  error = false,
  helperText,
  required = false,
  disabled = false,
  multiline = false,
  rows = 3,
  className = '',
  ...props
}) => {
  const inputClasses = `
    w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
    ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
  `;
  
  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {multiline ? (
        <textarea
          className={inputClasses}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          rows={rows}
          {...props}
        />
      ) : (
        <input
          type={type}
          className={inputClasses}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          {...props}
        />
      )}
      {helperText && (
        <p className={`mt-1 text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
};

// CircularProgress Component
export const CircularProgress = ({ size = 40, className = '', ...props }) => {
  return (
    <div className={`inline-block ${className}`} {...props}>
      <div 
        className="animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
        style={{ width: size, height: size }}
      ></div>
    </div>
  );
};

// Paper Component
export const Paper = ({ children, elevation = 1, className = '', ...props }) => {
  const elevations = {
    0: '',
    1: 'shadow-sm',
    2: 'shadow',
    3: 'shadow-md',
    4: 'shadow-lg',
    5: 'shadow-xl'
  };
  
  return (
    <div 
      className={`bg-white rounded-lg ${elevations[elevation]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Divider Component
export const Divider = ({ orientation = 'horizontal', className = '', ...props }) => {
  const orientationClasses = {
    horizontal: 'w-full h-px bg-gray-200',
    vertical: 'w-px h-full bg-gray-200'
  };
  
  return (
    <hr className={`border-0 ${orientationClasses[orientation]} ${className}`} {...props} />
  );
};

// Select Component
export const Select = ({ 
  children, 
  value, 
  onChange, 
  label,
  error = false,
  className = '',
  ...props 
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
          bg-white
        `}
        value={value}
        onChange={onChange}
        {...props}
      >
        {children}
      </select>
    </div>
  );
};

// FormControl Component
export const FormControl = ({ children, className = '', ...props }) => {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

// InputLabel Component
export const InputLabel = ({ children, className = '', ...props }) => {
  return (
    <label className={`block text-sm font-medium text-gray-700 mb-1 ${className}`} {...props}>
      {children}
    </label>
  );
};

// Card Component
export const Card = ({ children, className = '', ...props }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`} {...props}>
      {children}
    </div>
  );
};

// Dialog Component
export const Dialog = ({ 
  open, 
  onClose, 
  children, 
  maxWidth = 'md',
  className = '',
  ...props 
}) => {
  if (!open) return null;
  
  const maxWidthClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      <div 
        className={`relative bg-white rounded-lg shadow-lg p-6 m-4 ${maxWidthClasses[maxWidth]} w-full ${className}`}
        {...props}
      >
        {children}
      </div>
    </div>
  );
};

// Switch Component
export const Switch = ({ 
  checked, 
  onChange, 
  disabled = false,
  className = '',
  ...props 
}) => {
  return (
    <label className={`inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        {...props}
      />
      <div className={`
        relative w-11 h-6 bg-gray-200 rounded-full peer 
        ${checked ? 'bg-blue-600' : 'bg-gray-200'}
        transition-colors
      `}>
        <div className={`
          absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow transition-transform
          ${checked ? 'transform translate-x-5' : ''}
        `}></div>
      </div>
    </label>
  );
};

// Checkbox Component
export const Checkbox = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <label className={`inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <input
        type="checkbox"
        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        {...props}
      />
      {label && <span className="ml-2 text-sm text-gray-700">{label}</span>}
    </label>
  );
};

// Snackbar Component
export const Snackbar = ({ 
  open, 
  message, 
  onClose, 
  severity = 'info',
  autoHideDuration = 6000,
  className = '',
  ...props 
}) => {
  React.useEffect(() => {
    if (open && autoHideDuration) {
      const timer = setTimeout(onClose, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [open, autoHideDuration, onClose]);
  
  if (!open) return null;
  
  const severityClasses = {
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-600 text-white', 
    info: 'bg-blue-600 text-white',
    success: 'bg-green-600 text-white'
  };
  
  return (
    <div 
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 rounded-md shadow-lg z-50 ${severityClasses[severity]} ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span>{message}</span>
        {onClose && (
          <button 
            onClick={onClose}
            className="ml-4 text-white hover:text-gray-200"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

// Avatar Component
export const Avatar = ({ src, alt, children, size = 40, className = '', ...props }) => {
  return (
    <div 
      className={`inline-flex items-center justify-center rounded-full bg-gray-300 text-gray-700 font-medium ${className}`}
      style={{ width: size, height: size }}
      {...props}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full rounded-full object-cover" />
      ) : (
        children
      )}
    </div>
  );
};

export default {
  Box,
  Container,
  Typography,
  Alert,
  Button,
  TextField,
  CircularProgress,
  Paper,
  Divider,
  Select,
  FormControl,
  InputLabel,
  Card,
  Dialog,
  Switch,
  Checkbox,
  Snackbar,
  Avatar
}; 