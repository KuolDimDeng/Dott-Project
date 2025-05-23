// React-datepicker stub for static export
import React from 'react';

const DatePicker = ({ selected, onChange, className = '', placeholderText, ...props }) => (
  <input
    type="date"
    className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    value={selected ? (selected instanceof Date ? selected.toISOString().split('T')[0] : selected) : ''}
    onChange={(e) => onChange && onChange(e.target.value ? new Date(e.target.value) : null)}
    placeholder={placeholderText}
    {...props}
  />
);

export default DatePicker; 