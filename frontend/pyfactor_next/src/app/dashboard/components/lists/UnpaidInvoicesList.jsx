import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemText, CircularProgress, Button } from '@mui/material';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const UnpaidInvoicesList = ({ onSelect }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { addMessage } = useUserMessageContext();

  const fetchInvoices = async (pageNum) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('http://localhost:8000/api/unpaid-invoices/', {
        params: { page: pageNum, page_size: 10 },
      });
      if (pageNum === 1) {
        setInvoices(response.data.results);
      } else {
        setInvoices((prev) => [...prev, ...response.data.results]);
      }
      setHasMore(response.data.next);
    } catch (error) {
      console.error('Error fetching unpaid invoices:', error);
      addMessage('error', `Error fetching unpaid invoices: ${error.message}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices(1);
  }, []);

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
      fetchInvoices(page + 1);
    }
  };

  return (
    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
      <List>
        {invoices.map((invoice) => (
          <ListItem key={invoice.id} button onClick={() => onSelect(invoice)}>
            <ListItemText
              primary={`Invoice #${invoice.id}`}
              secondary={`Amount: $${invoice.amount} - Date: ${invoice.date}`}
            />
          </ListItem>
        ))}
      </List>
      {loading && <CircularProgress />}
      {!loading && hasMore && (
        <Button onClick={loadMore} fullWidth>
          Load More
        </Button>
      )}
    </Box>
  );
};

export default UnpaidInvoicesList;
