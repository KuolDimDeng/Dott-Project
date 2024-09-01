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
  Box
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import axiosInstance from '../components/axiosConfig';

const formatAmount = (amount) => {
  return typeof amount === 'number' ? amount.toFixed(2) : 'N/A';
};

const ExpandableRow = ({ name, data }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
          {name}
        </TableCell>
        <TableCell align="right">${formatAmount(data.total)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={2}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box margin={1}>
              <Table size="small">
                <TableBody>
                  {data.accounts.map((account, index) => (
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

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosInstance.get('/api/profit-and-loss/');
        setData(response.data);
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

  return (
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
          <ExpandableRow name="Revenue" data={data.Revenue} />
          <ExpandableRow name="Cost of Goods Sold" data={data['Cost of Goods Sold']} />
          <TableRow>
            <TableCell><strong>Gross Profit</strong></TableCell>
            <TableCell align="right"><strong>${formatAmount(data['Gross Profit'])}</strong></TableCell>
          </TableRow>
          <ExpandableRow name="Operating Expenses" data={data['Operating Expenses']} />
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
  );
}