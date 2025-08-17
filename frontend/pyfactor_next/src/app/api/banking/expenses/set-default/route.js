import { proxyToBackend } from '@/lib/auth/api-auth';

export async function POST(request) {
  return proxyToBackend('banking/expenses/set-default/', request);
}