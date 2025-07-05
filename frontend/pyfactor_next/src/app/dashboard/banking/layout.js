'use client';


import React from 'react';

export default function BankingLayout({ children }) {
  return (
    <div className="flex flex-col w-full h-full">
      {children}
    </div>
  );
} 