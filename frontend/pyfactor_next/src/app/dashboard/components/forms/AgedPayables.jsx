import React, { useState, useEffect } from 'react';
import axiosInstance from '../components/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';
import {
  Box, Typography, Paper, CircularProgress, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, useTheme
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

const AgedPayables = () => {
  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState(new Date());
  const { addMessage } = useUserMessageContext();
  const theme = useTheme();


  useEffect(() => {
    fetchAgedPayables();
  }, [asOfDate]);

  const fetchAgedPayables = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/api/reports/aged-payables/', {
        params: { as_of_date: asOfDate.toISOString().split('T')[0] }
      });
      setPayables(response.data);
    } catch (error) {
      logger.error('Error fetching aged payables:', error);
      addMessage('error', 'Failed to fetch aged payables');
    }
    setLoading(false);
  };

  const columns = [
    { id: 'vendor_name', label: 'Vendor', minWidth: 170 },
    { id: 'current', label: 'Current', minWidth: 100, align: 'right', format: (value) => `$${value.toFixed(2)}` },
    { id: 'days_1_30', label: '1-30 Days', minWidth: 100, align: 'right', format: (value) => `$${value.toFixed(2)}` },
    { id: 'days_31_60', label: '31-60 Days', minWidth: 100, align: 'right', format: (value) => `$${value.toFixed(2)}` },
    { id: 'days_61_90', label: '61-90 Days', minWidth: 100, align: 'right', format: (value) => `$${value.toFixed(2)}` },
    { id: 'days_over_90', label: 'Over 90 Days', minWidth: 100, align: 'right', format: (value) => `$${value.toFixed(2)}` },
    { id: 'total_outstanding', label: 'Total Outstanding', minWidth: 100, align: 'right', format: (value) => `$${value.toFixed(2)}` },
  ];

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Typography variant="h4" gutterBottom>
        Aged Payables
      </Typography>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          label="As of Date"
          value={asOfDate}
          onChange={(newValue) => setAsOfDate(newValue)}
          renderInput={(params) => <TextField {...params} />}
          sx={{ mb: 2 }}
        />
      </LocalizationProvider>
      <TableContainer component={Paper}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : (
              payables.map((row) => (
                <TableRow hover role="checkbox" tabIndex={-1} key={row.vendor_name}>
                  {columns.map((column) => {
                    const value = row[column.id];
                    return (
                      <TableCell key={column.id} align={column.align}>
                        {column.format && typeof value === 'number'
                          ? column.format(value)
                          : value}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AgedPayables;