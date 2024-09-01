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
  return typeof amount === 'number' ? amount.toFixed(2) : 'N/A';
};

const ExpandableRow = ({ name, data }) => {
  const [open, setOpen] = useState(false);

  if (!data || typeof data !== 'object') {
    return null;
  }

  const total = data.total || (Array.isArray(data) ? data.reduce((sum, item) => sum + (item.amount || 0), 0) : 0);
  const accounts = data.accounts || (Array.isArray(data) ? data : []);

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
      {accounts.length > 0 && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={2}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box margin={1}>
                <Table size="small">
                  <TableBody>
                    {accounts.map((account, index) => (
                      <TableRow key={index}>
                        <TableCell>{account.name}</TableCell>
                        <TableCell align="right">${formatAmount(account.amount)}</TableCell>
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

export default function BalanceSheetReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosInstance.get('/api/balance-sheet/');
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

  const assets = data.Assets || {};
  const liabilities = data.Liabilities || {};
  const equity = data.Equity || {};

  return (
    <TableContainer component={Paper}>
      <Typography variant="h4" gutterBottom>Balance Sheet</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell align="right">Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell colSpan={2}><strong>Assets</strong></TableCell>
          </TableRow>
          <ExpandableRow name="Current Assets" data={assets.Current} />
          <ExpandableRow name="Non-Current Assets" data={assets.NonCurrent} />
          <TableRow>
            <TableCell><strong>Total Assets</strong></TableCell>
            <TableCell align="right"><strong>${formatAmount(assets.total)}</strong></TableCell>
          </TableRow>

          <TableRow>
            <TableCell colSpan={2}><strong>Liabilities</strong></TableCell>
          </TableRow>
          <ExpandableRow name="Current Liabilities" data={liabilities.Current} />
          <ExpandableRow name="Non-Current Liabilities" data={liabilities.NonCurrent} />
          <TableRow>
            <TableCell><strong>Total Liabilities</strong></TableCell>
            <TableCell align="right"><strong>${formatAmount(liabilities.total)}</strong></TableCell>
          </TableRow>

          <TableRow>
            <TableCell colSpan={2}><strong>Equity</strong></TableCell>
          </TableRow>
          <ExpandableRow name="Equity Accounts" data={equity} />
          <TableRow>
            <TableCell><strong>Total Equity</strong></TableCell>
            <TableCell align="right"><strong>${formatAmount(equity.total)}</strong></TableCell>
          </TableRow>

          <TableRow>
            <TableCell><strong>Total Liabilities and Equity</strong></TableCell>
            <TableCell align="right"><strong>${formatAmount((liabilities.total || 0) + (equity.total || 0))}</strong></TableCell>
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