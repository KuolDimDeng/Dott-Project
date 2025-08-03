import React, { useState, useEffect, useRef } from 'react';

const SettingsMenu = ({ 
  open, 
  onClose, 
  onOptionSelect, 
  selectedOption,
  onIntegrationsClick,
  onDeviceSettingsClick
}) => {
  // Track window width for menu positioning
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const menuRef = useRef(null);
  
  // Update window width on resize for responsive menu positioning
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);
  
  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && open) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  // Menu options array
  const options = [
    'Settings',
    'Profile Settings',
    'Business Settings',
    'Accounting Settings',
    'Taxes',
    'Payroll Settings',
    'Device Settings',
    'Subscriptions & Billing',
    'Security',
  ];

  // Handle option click and call the onOptionSelect callback
  const handleOptionClick = (option) => {
    if (typeof onOptionSelect === 'function') {
      onOptionSelect(option); // Call the callback passed as a prop
    }
    onClose(); // Close the menu after selection
  };

  if (!open) return null;

  return (
    <div 
      className="fixed top-16 right-4 w-64 bg-white rounded-lg shadow-lg border border-gray-200 mt-1 z-50"
      ref={menuRef}
      style={{
        maxWidth: 'calc(100vw - 2rem)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        zIndex: 10000000,
      }}
    >
      <div className="dark:bg-gray-800 dark:border-gray-700">
        <div className="py-1">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleOptionClick(option)}
              className={`w-full text-left px-4 py-2.5 text-sm ${
                selectedOption === option
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              } transition-colors duration-150`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;
