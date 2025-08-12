export async function register() {
  // Sentry disabled for now
}

export const onRequestError = async (err, request, context) => {
  // Sentry disabled for now
  console.error('Request error:', err);
}