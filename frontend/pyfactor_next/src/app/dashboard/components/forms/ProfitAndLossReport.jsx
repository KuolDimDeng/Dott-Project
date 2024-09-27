import React from 'react';
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
  Box,
  useTheme
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import axiosInstance from '../components/axiosConfig';

const formatAmount = (amount) => {
  return typeof amount === 'number' ? amount.toFixed(2) : 'N/A';
};

const ExpandableRow = ({ name, data }) => {
  const [open, setOpen] = React.useState(false);

  // Check if data exists and has a total property
  const total = data && data.total ? data.total : 0;
  const accounts = data && data.accounts ? data.accounts : [];


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
    </>
  );
};

export default function ProfitAndLossReport() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const theme = useTheme();


  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosInstance.get('/api/reports/profit-and-loss/');
        console.log('API Response:', response.data); // Log the response data
        setData(response.data);
      } catch (error) {
        console.error('Error fetching data:', error.response || error);
        setError(error.response?.data?.error || error.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">Error: {error}</Typography>;
  if (!data) return <Typography>No data available for the current date.</Typography>;

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>

    <TableContainer component={Paper}>
      <Typography variant="h4" gutterBottom>Profit and Loss Statement</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell align="right">Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.Revenue && <ExpandableRow name="Revenue" data={data.Revenue} />}
          {data['Cost of Goods Sold'] && <ExpandableRow name="Cost of Goods Sold" data={data['Cost of Goods Sold']} />}
          <TableRow>
            <TableCell><strong>Gross Profit</strong></TableCell>
            <TableCell align="right"><strong>${formatAmount(data['Gross Profit'])}</strong></TableCell>
          </TableRow>
          {data['Operating Expenses'] && <ExpandableRow name="Operating Expenses" data={data['Operating Expenses']} />}
          <TableRow>
            <TableCell><strong>Net Income</strong></TableCell>
            <TableCell align="right"><strong>${formatAmount(data['Net Income'])}</strong></TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <Typography variant="body2" style={{marginTop: '20px'}}>
        Raw data for debugging:
      </Typography>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </TableContainer>
    </Box>
  );
}