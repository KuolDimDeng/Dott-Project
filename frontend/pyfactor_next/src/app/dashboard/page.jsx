// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/page.jsx
import React from 'react';
import DashboardContent from './DashboardContent';

export default function Page({ params }) {
  const token = params.token;
  return (
    <div>
      <DashboardContent token={token} />
    </div>
  );
}
