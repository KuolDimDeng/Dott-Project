
// Reset circuit breakers
if (typeof window !== 'undefined') {
  window.__CIRCUIT_BREAKERS = {};
  if (window.__resetCircuitBreakers) {
    window.__resetCircuitBreakers();
    console.log('[NetworkFix] Circuit breakers reset');
  }
}
