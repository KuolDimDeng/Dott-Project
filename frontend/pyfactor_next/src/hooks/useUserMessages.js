import { useState, useEffect, useCallback, useRef } from 'react';

export function useUserMessages() {
  const [messages, setMessages] = useState([]);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    eventSourceRef.current = new EventSource('http://localhost:8000/api/messages/');

    eventSourceRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages((prevMessages) => [...prevMessages.slice(-49), message]); // Keep last 50 messages
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const addMessage = useCallback((type, content) => {
    setMessages((prevMessages) => [...prevMessages.slice(-49), { type, content }]); // Keep last 50 messages
  }, []);

  return { messages, addMessage };
}