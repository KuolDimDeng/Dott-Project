import React, { useState, useEffect } from 'react';
import { Menu, MenuItem, styled } from '@mui/material';
import { menuItemStyle } from '../../../../styles/menuStyles';

// No styled component needed as we'll use direct positioning
const StyledMenu = styled(Menu)(({ theme }) => ({
  '& .MuiPaper-root': {
    minWidth: 200,
    backgroundColor: '#ffffff',
    backgroundImage: 'linear-gradient(to bottom, #f8f9fa, #ffffff)',
    color: '#263238',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    boxShadow: theme.shadows[4],
  },
}));

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  ...menuItemStyle,
  padding: '10px 16px',
  color: '#263238', 
  fontSize: '0.875rem',
  '&:hover': {
    backgroundColor: 'rgba(25, 118, 210, 0.08)', 
  },
  '&.Mui-selected': {
    backgroundColor: 'rgba(25, 118, 210, 0.12)', 
    '&:hover': {
      backgroundColor: 'rgba(25, 118, 210, 0.15)', 
    },
  },
}));

const SettingsMenu = ({ 
  anchorEl, 
  open, 
  onClose, 
  onOptionSelect, 
  selectedOption,
  onIntegrationsClick,
  onDeviceSettingsClick,
  backgroundColor
}) => {
  // Track window width for menu positioning
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  
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

  // Menu options array
  const options = [
    'Profile Settings',
    'Business Settings',
    'Accounting Settings',
    'Payroll Settings',
    'Device Settings',
    'Subscriptions & Billing',
  ];

  // Handle option click and call the onOptionSelect callback
  const handleOptionClick = (option) => {
    if (typeof onOptionSelect === 'function') {
      onOptionSelect(option); // Call the callback passed as a prop
    }
    onClose(); // Close the menu after selection
  };

  return (
    <StyledMenu
      anchorEl={null}
      anchorReference="anchorPosition"
      anchorPosition={{ top: 60, left: windowWidth - 220 }}
      open={open}
      onClose={onClose}
    >
      {options.map((option, index) => (
        <StyledMenuItem
          key={option}
          onClick={() => handleOptionClick(option)} // Handle item click
          selected={option === selectedOption} // Highlight the selected option
          style={{
            backgroundColor: selectedOption === option
              ? 'rgba(10, 57, 119, 0.15)' 
              : 'transparent',
            '&:hover': {
              backgroundColor: '#f0f3f9', // Very light gray with slight blue tint
            },
          }}
        >
          {option}
        </StyledMenuItem>
      ))}
    </StyledMenu>
  );
};

export default SettingsMenu;
