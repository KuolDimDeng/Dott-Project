// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/shared/StepNavigation/StepNavigation.styles.js

// With Tailwind CSS, we don't need to define styled components with JavaScript
// Instead, we can use Tailwind classes directly in the component
// This file is kept for backward compatibility but doesn't need to export actual styles

// Example of migrating from styled-components to Tailwind CSS:
// Before:
// export const NavigationContainer = styled(Box)(({ theme }) => ({
//     display: 'flex',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginTop: theme.spacing(4),
//     gap: theme.spacing(2)
// }));
//
// After:
// Use these Tailwind classes directly in your component:
// className="flex justify-between items-center mt-8 gap-4"

// For backward compatibility, provide a dummy export that won't be used
export const NavigationContainer = ({ children, ...props }) => (
  <div className="flex justify-between items-center mt-8 gap-4" {...props}>
    {children}
  </div>
);