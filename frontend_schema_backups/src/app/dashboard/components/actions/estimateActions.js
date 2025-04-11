import { axiosInstance } from '@/lib/axiosConfig';

export const saveEstimate = async (estimateId) => {
  try {
    const response = await axiosInstance.post(`/api/estimates/${estimateId}/save/`);
    return response.data;
  } catch (error) {
    console.error('Error saving estimate:', error);
    throw error;
  }
};

export const printEstimate = async (estimateId) => {
  try {
    const response = await axiosInstance.get(`/api/estimates/${estimateId}/print/`, {
      responseType: 'blob', // important for receiving PDF data
    });
    const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');

    // Optional: Revoke the URL after a timeout to prevent memory leaks
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 5000);
  } catch (error) {
    console.error('Error printing estimate:', error);
    throw error;
  }
};

export const emailEstimate = async (estimateId) => {
  try {
    const response = await axiosInstance.post(`/api/estimates/${estimateId}/email/`);
    return response.data;
  } catch (error) {
    console.error('Error emailing estimate:', error);
    throw error;
  }
};

export const getEstimatePdf = async (estimateId) => {
  try {
    const response = await axiosInstance.get(`/api/estimates/${estimateId}/pdf`, {
      responseType: 'blob', // important for receiving PDF data
    });

    if (!response.status === 200) {
      throw new Error('Failed to fetch PDF');
    }

    const blob = response.data;
    console.log('PDF Blob:', blob);
    return blob;
  } catch (error) {
    console.error('Error in getEstimatePdf:', error);
    throw error;
  }
};
