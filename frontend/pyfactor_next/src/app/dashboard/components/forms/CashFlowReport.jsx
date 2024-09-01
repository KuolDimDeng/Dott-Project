import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography,
  Collapse,
  IconButton,
  Box
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import axiosInstance from '../components/axiosConfig';

const formatAmount = (amount) => {
  if (typeof amount !== 'number') return 'N/A';
  return amount.toFixed(2);
};

const ExpandableRow = ({ name, data }) => {
  const [open, setOpen] = useState(false);

  if (!data || typeof data !== 'object') {
    return null;
  }

  const total = data.total || (Array.isArray(data) ? data.reduce((sum, item) => sum + (item.amount || 0), 0) : 0);
  const items = data.items || (Array.isArray(data) ? data : []);

  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
          {name}
        </TableCell>
        <TableCell align="right">${formatAmount(total)}</TableCell>
      </TableRow>
      {items.length > 0 && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={2}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box margin={1}>
                <Table size="small">
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell align="right">${formatAmount(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export default function CashFlowReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosInstance.get('/api/cash-flow/');
        console.log('API Response:', response);
        if (response.data) {
          setData(response.data);
        } else {
          setError('Unexpected data format received');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.response?.data?.error || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">Error: {error}</Typography>;
  if (!data) return <Typography>No data available for the current date.</Typography>;

  const operating = data.Operating || {};
  const investing = data.Investing || {};
  const financing = data.Financing || {};

  return (
    <TableContainer component={Paper}>
      <Typography variant="h4" gutterBottom>Cash Flow Statement</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell align="right">Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell colSpan={2}><strong>Operating Activities</strong></TableCell>
          </TableRow>
          <ExpandableRow name="Operating Activities" data={operating} />

          <TableRow>
            <TableCell colSpan={2}><strong>Investing Activities</strong></TableCell>
          </TableRow>
          <ExpandableRow name="Investing Activities" data={investing} />

          <TableRow>
            <TableCell colSpan={2}><strong>Financing Activities</strong></TableCell>
          </TableRow>
          <ExpandableRow name="Financing Activities" data={financing} />

          <TableRow>
            <TableCell><strong>Net Increase/Decrease in Cash</strong></TableCell>
            <TableCell align="right"><strong>${formatAmount(
              (operating.total || 0) + (investing.total || 0) + (financing.total || 0)
            )}</strong></TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {process.env.NODE_ENV === 'development' && (
        <>
          <Typography variant="body2" style={{marginTop: '20px'}}>
            Raw data for debugging:
          </Typography>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </>
      )}
    </TableContainer>
  );
}