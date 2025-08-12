'use client';

import React, { useState, useMemo } from 'react';
import { CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const SearchableCheckList = ({ 
  items, 
  selectedItems, 
  onSelectionChange, 
  searchPlaceholder = "Search...",
  displayKey = "name",
  valueKey = "id",
  showCount = true,
  maxHeight = "300px",
  leadSelection = false,
  leadValue = null,
  onLeadChange = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    
    return items.filter(item => {
      const displayValue = typeof displayKey === 'function' 
        ? displayKey(item) 
        : item[displayKey];
      return displayValue.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [items, searchTerm, displayKey]);

  const handleToggle = (itemValue) => {
    const newSelection = selectedItems.includes(itemValue)
      ? selectedItems.filter(id => id !== itemValue)
      : [...selectedItems, itemValue];
    
    onSelectionChange(newSelection);
    
    // If unchecking an item that was the lead, clear lead selection
    if (leadSelection && !newSelection.includes(itemValue) && leadValue === itemValue) {
      onLeadChange('');
    }
  };

  const handleLeadChange = (itemValue) => {
    if (selectedItems.includes(itemValue)) {
      onLeadChange(itemValue);
    }
  };

  return (
    <div className="border border-gray-300 rounded-md">
      {/* Search input */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {showCount && (
          <p className="mt-2 text-sm text-gray-500">
            {selectedItems.length} selected of {items.length} total
          </p>
        )}
      </div>

      {/* Scrollable list */}
      <div 
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        {filteredItems.length === 0 ? (
          <p className="p-4 text-center text-gray-500">No items found</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredItems.map((item) => {
              const itemValue = item[valueKey];
              const isSelected = selectedItems.includes(itemValue);
              const isLead = leadSelection && leadValue === itemValue;
              const displayValue = typeof displayKey === 'function' 
                ? displayKey(item) 
                : item[displayKey];

              return (
                <div 
                  key={itemValue}
                  className="p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggle(itemValue)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-900">
                        {displayValue}
                      </span>
                    </label>
                    
                    {leadSelection && isSelected && (
                      <button
                        type="button"
                        onClick={() => handleLeadChange(itemValue)}
                        className={`ml-3 px-2 py-1 text-xs rounded ${
                          isLead
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {isLead ? '★ Lead' : 'Set as Lead'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchableCheckList;