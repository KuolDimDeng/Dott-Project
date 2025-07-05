import React from 'react';
import { Box, Typography } from '@/components/ui/TailwindComponents';
import { logger } from '@/utils/logger';

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
    <Box className="p-4">
      <Typography variant="h5" className="mb-4">
        Create Options
      </Typography>
      <ul className="space-y-2">
        {createOptions.map((option, index) => (
          <li 
            key={index} 
            className="p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors"
            onClick={() => handleOptionClick(option)}
          >
            <span className="text-gray-900">{option}</span>
          </li>
        ))}
      </ul>
    </Box>
  );
};

export default CreateOptions;
