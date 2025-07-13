'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { COUNTRY_PHONE_CODES, getCountryByCode, formatPhoneNumber, getInternationalPhoneNumber, validatePhoneNumber } from '@/utils/countryPhoneCodes';

const PhoneInput = ({ 
  value = '', 
  countryCode = 'US', 
  onChange, 
  onCountryChange,
  className = '', 
  error = false,
  placeholder = 'Enter phone number',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const selectedCountry = getCountryByCode(countryCode);
  
  // Filter countries based on search
  const filteredCountries = COUNTRY_PHONE_CODES.filter(country =>
    country.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.phoneCode.includes(searchTerm)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCountrySelect = (country) => {
    onCountryChange?.(country.code);
    setIsOpen(false);
    setSearchTerm('');
    // Focus back to phone input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handlePhoneChange = (e) => {
    const inputValue = e.target.value;
    // Remove all non-numeric characters for storage
    const cleanNumber = inputValue.replace(/\D/g, '');
    
    // Always allow the change, validation will be shown in UI
    onChange?.(cleanNumber);
  };

  // Format the display value
  const formattedValue = formatPhoneNumber(value, countryCode);
  
  // Validate current phone number
  const validation = value ? validatePhoneNumber(value, countryCode) : { isValid: true, error: null };

  return (
    <div className="relative">
      <div className={`flex border rounded-md ${error || !validation.isValid ? 'border-red-500' : 'border-gray-300'} ${disabled ? 'bg-gray-100' : 'bg-white'}`}>
        {/* Country Code Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`flex items-center px-3 py-2 border-r border-gray-300 ${disabled ? 'cursor-not-allowed' : 'hover:bg-gray-50'} focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-l-md`}
          >
            <span className="text-lg mr-2">{selectedCountry.flag}</span>
            <span className="text-sm font-medium text-gray-700">{selectedCountry.phoneCode}</span>
            <ChevronDownIcon className={`ml-1 h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 z-50 w-72 mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
              {/* Search */}
              <div className="p-2 border-b">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Country List */}
              <div className="max-h-48 overflow-y-auto">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full flex items-center px-3 py-2 text-left hover:bg-gray-50 ${
                      country.code === countryCode ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="text-lg mr-3">{country.flag}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{country.country}</div>
                      <div className="text-xs text-gray-500">{country.phoneCode}</div>
                    </div>
                  </button>
                ))}
                {filteredCountries.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500 text-center">
                    No countries found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          ref={inputRef}
          type="tel"
          value={formattedValue}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 px-3 py-2 focus:outline-none focus:ring-1 ${
            error ? 'focus:ring-red-500' : 'focus:ring-blue-500'
          } rounded-r-md ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
        />
      </div>

      {/* Validation error message */}
      {!validation.isValid && (
        <div className="mt-1 text-xs text-red-600">
          {validation.error}
        </div>
      )}
      
      {/* Helper text showing international format */}
      {value && !error && validation.isValid && (
        <div className="mt-1 text-xs text-gray-500">
          International format: {getInternationalPhoneNumber(value, countryCode)}
        </div>
      )}
    </div>
  );
};

export default PhoneInput;