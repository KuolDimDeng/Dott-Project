'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';

const MultiSelectDropdown = ({ 
  items, 
  selectedItems, 
  onSelectionChange, 
  placeholder = "Select items...",
  displayKey = "name",
  valueKey = "id",
  showCount = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (itemValue) => {
    const newSelection = selectedItems.includes(itemValue)
      ? selectedItems.filter(id => id !== itemValue)
      : [...selectedItems, itemValue];
    
    onSelectionChange(newSelection);
  };

  const filteredItems = items.filter(item => {
    const displayValue = typeof displayKey === 'function' 
      ? displayKey(item) 
      : item[displayKey];
    return displayValue.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getSelectedDisplay = () => {
    if (selectedItems.length === 0) return placeholder;
    if (selectedItems.length === 1) {
      const item = items.find(i => i[valueKey] === selectedItems[0]);
      if (item) {
        return typeof displayKey === 'function' ? displayKey(item) : item[displayKey];
      }
    }
    return `${selectedItems.length} selected`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-gray-50"
      >
        <div className="flex items-center justify-between">
          <span className="block truncate text-sm">
            {getSelectedDisplay()}
          </span>
          <ChevronDownIcon 
            className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      {/* Dropdown content */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No items found</div>
            ) : (
              filteredItems.map((item) => {
                const itemValue = item[valueKey];
                const isSelected = selectedItems.includes(itemValue);
                const displayValue = typeof displayKey === 'function' 
                  ? displayKey(item) 
                  : item[displayKey];

                return (
                  <label
                    key={itemValue}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(itemValue)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                    <span className="ml-3 text-sm text-gray-900 flex-1">
                      {displayValue}
                    </span>
                    {isSelected && (
                      <CheckIcon className="h-4 w-4 text-blue-600" />
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Selected count */}
          {showCount && items.length > 0 && (
            <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200">
              {selectedItems.length} of {items.length} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;