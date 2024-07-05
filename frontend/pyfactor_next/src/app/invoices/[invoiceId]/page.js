'use client';
import { useParams } from 'next/navigation';
import InvoiceDetails from '../../dashboard/components/forms/InvoiceDetails';

export default function InvoiceDetailsPage() {
  const params = useParams();
  return <InvoiceDetails invoiceId={params.invoiceId} />;
}