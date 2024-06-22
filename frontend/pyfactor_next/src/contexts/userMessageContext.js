import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const UserMessageContext = createContext();

export function UserMessageProvider({ children }) {
  const [messages, setMessages] = useState([]);

  const addMessage = useCallback((type, content) => {
    setMessages(prevMessages => [...prevMessages, { type, content }]);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ messages, addMessage }), [messages, addMessage]);

  return (
    <UserMessageContext.Provider value={contextValue}>
      {children}
    </UserMessageContext.Provider>
  );
}

export function useUserMessageContext() {
  const context = useContext(UserMessageContext);
  if (!context) {
    throw new Error('useUserMessageContext must be used within a UserMessageProvider');
  }
  return context;
}