import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Paper, Typography } from '@mui/material';

const ServiceList = ({ services }) => {
  if (!services || services.length === 0) {
    return <Typography>No services found.</Typography>;
  }

  return (
    <Paper>
      <Typography variant="h6" component="h2" gutterBottom>
        Service List
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Service Code</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell>Recurring</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.id}>
              <TableCell>{service.name}</TableCell>
              <TableCell>{service.description}</TableCell>
              <TableCell>${service.price}</TableCell>
              <TableCell>{service.service_code}</TableCell>
              <TableCell>{service.duration} minutes</TableCell>
              <TableCell>{service.is_recurring ? 'Yes' : 'No'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default ServiceList;
