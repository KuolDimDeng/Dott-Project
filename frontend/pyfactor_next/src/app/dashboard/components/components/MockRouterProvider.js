// src/app/dashboard/components/MockRouterProvider.js
import React from 'react';
import { useRouter } from 'next/router';

const MockRouterProvider = ({ children }) => {
  const router = useRouter();

  return React.cloneElement(children, { router });
};

export default MockRouterProvider;
