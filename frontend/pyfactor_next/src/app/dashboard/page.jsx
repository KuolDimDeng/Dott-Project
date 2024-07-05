///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/page.jsx
// src/app/dashboard/page.jsx
// src/app/dashboard/page.jsx
import DashboardContent from './DashboardContent';

export default function Page({ params }) {
  const token = params.token;
  return <DashboardContent token={token} />;
}
