export default function TenantDashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Loading your dashboard...</h2>
        <p className="text-gray-500">Please wait while we retrieve your data.</p>
      </div>
    </div>
  );
}