'use client';


import DashboardWrapper from './DashboardWrapper';
import ClientDataSync from '@/components/clientDataSync';

export default function ClientWrapper({ newAccount, plan }) {
  return (
    <>
      <ClientDataSync />
      <DashboardWrapper newAccount={newAccount} plan={plan} />
    </>
  );
} 