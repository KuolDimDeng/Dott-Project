import React from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';

const CreateOptions = ({ onOptionSelect }) => {
  const createOptions = [
    'Transaction',
    'Product',
    'Service',
    'Customer',
    'Bill',
    'Invoice',
    'Vendor',
    'Estimate',
    'Sales Order',
  ];

  const handleOptionClick = (option) => {
    onOptionSelect(option);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Create Options
      </Typography>
      <List>
        {createOptions.map((option, index) => (
          <ListItem
            key={index}
            button
            onClick={() => handleOptionClick(option)}
          >
            <ListItemText primary={option} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default CreateOptions;