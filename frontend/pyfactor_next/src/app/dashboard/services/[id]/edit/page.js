'use client';


import React, { useState, useEffect } from 'react';
import ServiceForm from '../../components/ServiceForm';
import { useParams } from 'next/navigation';

export default function EditServicePage() {
  const params = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const response = await fetch(`/api/services/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch service');
        }
        const data = await response.json();
        setService(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-semibold">
          Edit Service: {service?.name}
        </h1>
      </div>
      <ServiceForm mode="edit" service={service} />
    </div>
  );
} 