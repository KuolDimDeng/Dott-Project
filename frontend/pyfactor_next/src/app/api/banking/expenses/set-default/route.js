import { handleApiRequest } from '@/utils/api';

export async function POST(request) {
  return handleApiRequest(request, 'banking/expenses/set-default/', 'POST');
}