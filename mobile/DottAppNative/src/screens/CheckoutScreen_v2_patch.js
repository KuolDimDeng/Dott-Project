// Temporary patch for CheckoutScreen.js to use the new v2 endpoint
// Replace line 413 in CheckoutScreen.js with this:

// OLD LINE (line 413):
// const orderResponse = await api.post('/marketplace/consumer/orders/', finalOrderData);

// NEW LINE:
const orderResponse = await api.post('/marketplace/consumer/orders/v2/', finalOrderData);

// This uses the new endpoint with better validation and error handling
// The v2 endpoint will:
// 1. Validate all fields before database operations
// 2. Ensure items is always a proper JSON array
// 3. Clean all nullable fields properly
// 4. Provide detailed error messages if validation fails