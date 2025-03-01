import { createContext } from 'react';

export const ErrorBoundaryContext = createContext({
  handleError: (error) => {
    console.error('Uncaught error:', error);
  },
});

export const ErrorBoundaryProvider = ({ children }) => {
  const handleError = (error) => {
    // TODO: Add error reporting service integration
    console.error('Error captured:', error);
  };

  return (
    <ErrorBoundaryContext.Provider value={{ handleError }}>
      {children}
    </ErrorBoundaryContext.Provider>
  );
};