///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/page.jsx
// src/app/dashboard/page.jsx
import Dashboard from './Dashboard.client';

export default function Page({ params }) {
  const token = params.token;
  return <Dashboard token={token} />;
}