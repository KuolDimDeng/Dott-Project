import React from 'react';
import { Menu, MenuItem, styled } from '@mui/material';
import { menuItemStyle } from '../../../../styles/menuStyles';

const StyledMenu = styled(Menu)(({ theme }) => ({
  '& .MuiPaper-root': {
    marginTop: theme.spacing(0),  // Move up
    marginRight: theme.spacing(-3),  // Move right
    minWidth: 180,
    backgroundColor: "#e1f5fe",
    color: "#263238",  // Change this to your desired text color
    boxShadow: 'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
  },
}));

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  ...menuItemStyle,
  color: "#263238",  // Change this to your desired text color
  '&:hover': {
    backgroundColor: '#bbdefb',  // Change this to your desired hover color
  },
  '&.Mui-selected': {
    backgroundColor: '#90caf9',  // Change this to your desired selected color
    '&:hover': {
      backgroundColor: '#64b5f6',  // Change this to your desired selected hover color
    },
  },
}));

const SettingsMenu = ({ anchorEl, open, onClose, onOptionSelect, selectedOption }) => {
  console.log('SettingsMenu: Rendering with selectedOption:', selectedOption);

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
    console.log('SettingsMenu: handleOptionClick called with option:', option);
    if (typeof onOptionSelect === 'function') {
      onOptionSelect(option); // Call the callback passed as a prop
    } else {
      console.error('SettingsMenu: onOptionSelect is not a function');
    }
    onClose(); // Close the menu after selection
  };

  return (
    <StyledMenu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      {options.map((option) => (
        <StyledMenuItem
          key={option}
          onClick={() => handleOptionClick(option)} // Handle item click
          selected={option === selectedOption} // Highlight the selected option
        >
          {option}
        </StyledMenuItem>
      ))}
    </StyledMenu>
  );
};

export default SettingsMenu;
