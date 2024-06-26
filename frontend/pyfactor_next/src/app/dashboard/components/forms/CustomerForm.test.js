import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';
import CustomerForm from './CustomerForm';

describe('CustomerForm', () => {
  test('renders the form correctly', () => {
    render(
      <MemoryRouterProvider>
        <CustomerForm />
      </MemoryRouterProvider>
    );

    // Add your test assertions here
    expect(screen.getByText('New Customer')).toBeInTheDocument();
    // ...
  });
});