// In /app/dashboard/layout.js
import DashboardSetupStatus from '@/components/DashboardSetupStatus';

export default function DashboardLayout({ children }) {
    return (
        <>
            {children}
            <DashboardSetupStatus />
        </>
    );
}