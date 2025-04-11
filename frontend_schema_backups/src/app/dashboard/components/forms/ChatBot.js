import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import debounce from 'lodash/debounce';
import { ChatIcon, SendIcon, CloseIcon } from '@/app/components/icons';

const Chatbot = ({ userName, backgroundColor = 'bg-white dark:bg-gray-800' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const [userDatabase, setUserDatabase] = useState(null);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // To track if initialization has been done

  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializeChat();
      setIsInitialized(true); // Mark as initialized to prevent re-fetching on reopen
    } else if (!isOpen) {
      setMessages([]); // Clear messages when closing
      setIsInitialized(false); // Reset initialization state
      if (socket) {
        socket.close();
      }
    }

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeChat = async () => {
    try {
      const profile = await fetchUserProfile();
      if (profile && profile.database_name) {
        await fetchMessages(profile.database_name);
        initializeWebSocket(profile.database_name);
      } else {
        setError('Failed to get user database information.');
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      setError('Failed to initialize chat. Please try again later.');
    }
  };

  const isTokenExpired = (token) => {
    if (!token) return true;

    try {
      const payloadBase64 = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payloadBase64));
      const expiration = decodedPayload.exp * 1000; // Convert to milliseconds

      return Date.now() > expiration;
    } catch (e) {
      console.error('Failed to decode token:', e);
      return true;
    }
  };

  const initializeWebSocket = useCallback(
    (database_name) => {
      const token = localStorage.getItem('token');
      console.log('Retrieved token:', token);

      if (!token || token === 'null') {
        console.error('No valid authentication token found or token has expired');
        setError('Authentication error. Please log in again.');
        return;
      }

      const sanitizedUserName = userName.replace('@', '_').replace('.', '_');
      const newSocket = new WebSocket(
        `ws://localhost:8000/ws/chat/${sanitizedUserName}/?token=${token}&database=${database_name}`
      );

      newSocket.onopen = () => {
        console.log('WebSocket connected');
        setIsSocketConnected(true);
        setError(null);
      };

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            throw new Error(data.error);
          }
          setMessages((prevMessages) => [
            ...prevMessages,
            { message: data.message, is_from_user: data.username === sanitizedUserName },
          ]);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          setError('Failed to process incoming message.');
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error. Please try again.');
      };

      newSocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event);
        setIsSocketConnected(false);
        setError('Connection lost. Reconnecting...');
        setTimeout(() => initializeWebSocket(database_name), 3000); // Attempt reconnection after 3 seconds
      };

      setSocket(newSocket);
    },
    [userName]
  );

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      console.log('User profile:', response.data);
      console.log('User database:', response.data.database_name);
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError(`Failed to fetch user profile: ${error.message}`);
      return null;
    }
  };

  const fetchMessages = async (database_name) => {
    try {
      const response = await axiosInstance.get('/api/chatbot/get_messages/', {
        params: { database: database_name },
      });
      console.log('Fetched messages:', response.data);
      if (Array.isArray(response.data.messages)) {
        setMessages(response.data.messages);
      } else {
        console.error('Received messages is not an array:', response.data.messages);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to fetch messages. Please try again.');
      setMessages([]);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const debouncedHandleSend = useMemo(
    () =>
      debounce((input, socket) => {
        if (input.trim() && socket && socket.readyState === WebSocket.OPEN) {
          console.log('Sending message:', input);
          const message = JSON.stringify({ message: input });
          socket.send(message);
          setInput('');
          setError(null);
        } else {
          console.error(
            'Unable to send message. Input:',
            input,
            'Socket state:',
            socket ? socket.readyState : 'No socket'
          );
          setError('Unable to send message. Please check your connection.');
        }
      }, 300),
    [socket]
  );

  const handleSend = () => {
    debouncedHandleSend(input, socket);
  };

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 pointer-events-auto">
      {isOpen ? (
        <div className={`w-[300px] h-[400px] shadow-lg rounded-lg flex flex-col ${backgroundColor} pointer-events-auto`}>
          <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium dark:text-white">Hello {userName}, need help?</h3>
            <button
              onClick={handleToggle}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close Chat"
            >
              <CloseIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto p-4">
            {error && (
              <p className="text-red-600 dark:text-red-400 mb-2">
                {error}
              </p>
            )}
            {Array.isArray(messages) &&
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-3 ${msg.is_from_user ? 'text-right' : 'text-left'}`}
                >
                  <div
                    className={`inline-block p-2 rounded-lg max-w-[80%] ${
                      msg.is_from_user 
                        ? 'bg-blue-50 dark:bg-blue-900 text-gray-800 dark:text-gray-100' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                    }`}
                  >
                    {typeof msg.message === 'string' ? (
                      msg.message.split('\n').map((line, lineIndex) => (
                        <p
                          key={lineIndex}
                          className={`block ${lineIndex < msg.message.split('\n').length - 1 ? 'mb-1' : ''}`}
                        >
                          {line}
                        </p>
                      ))
                    ) : (
                      <p>{msg.message}</p>
                    )}
                  </div>
                </div>
              ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 flex">
            <input
              type="text"
              className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-main focus:border-primary-main dark:bg-gray-700 dark:text-white"
              value={input}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              aria-label="Type a message"
            />
            <button
              onClick={handleSend}
              className="px-3 py-2 bg-primary-main hover:bg-primary-dark text-white rounded-r-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50"
              aria-label="Send Message"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleToggle}
          className="w-12 h-12 rounded-full bg-primary-main hover:bg-primary-dark text-white flex items-center justify-center shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-opacity-50"
          aria-label="Open Chat"
        >
          <ChatIcon className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default Chatbot;
