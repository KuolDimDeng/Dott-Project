// /Users/kuoldeng/projectx/frontend/pyfactor_next/mocks/useRouter.js
import mockRouter from 'next-router-mock';
import { createDynamicRouteParser } from 'next-router-mock/dynamic-routes';

mockRouter.useParser(
  createDynamicRouteParser([
    '/dashboard/customers/[customerId]',
    // Add other dynamic routes if needed
  ])
);

export default mockRouter;