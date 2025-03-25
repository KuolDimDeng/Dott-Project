import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Paper, Typography } from '@mui/material';

const ProductList = ({ products }) => {
  if (!products || products.length === 0) {
    return <Typography>No products found.</Typography>;
  }

  return (
    <Paper>
      <Typography variant="h6" component="h2" gutterBottom>
        Product List
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Product Code</TableCell>
            <TableCell>Stock Quantity</TableCell>
            <TableCell>Reorder Level</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>{product.name}</TableCell>
              <TableCell>{product.description}</TableCell>
              <TableCell>${product.price}</TableCell>
              <TableCell>{product.product_code}</TableCell>
              <TableCell>{product.stock_quantity}</TableCell>
              <TableCell>{product.reorder_level}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default ProductList;
