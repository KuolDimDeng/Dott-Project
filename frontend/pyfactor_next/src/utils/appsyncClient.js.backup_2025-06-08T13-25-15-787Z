import { AWSAppSyncClient, createAppSyncLink } from 'aws-appsync';
import { ApolloLink } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';

let appSyncClient = null;

/**
 * Creates and returns an AppSync client with in-memory caching
 */
export const getAppSyncClient = (credentials) => {
  if (appSyncClient) return appSyncClient;
  
  // Create in-memory cache
  const cache = new InMemoryCache({
    dataIdFromObject: object => {
      switch (object.__typename) {
        case 'Customer':
          return `Customer:${object.id}`;
        default:
          return object.id ? `${object.__typename}:${object.id}` : null;
      }
    }
  });
  
  // AppSync configuration
  const config = {
    url: process.env.NEXT_PUBLIC_APPSYNC_URL || '',
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    auth: {
      type: 'API_KEY',
      apiKey: process.env.NEXT_PUBLIC_APPSYNC_API_KEY || ''
    },
    disableOffline: true
  };
  
  // Create AppSync link
  const appSyncLink = createAppSyncLink({
    ...config,
    complexObjectsCredentials: credentials
  });
  
  // Create HTTP link as fallback
  const httpLink = createHttpLink({
    uri: '/api/graphql'
  });
  
  // Conditionally use AppSync or HTTP link
  const link = ApolloLink.split(
    operation => operation.getContext().useAppSync === true,
    appSyncLink,
    httpLink
  );
  
  // Create the client
  appSyncClient = new AWSAppSyncClient({
    ...config,
    link,
    cache
  });
  
  return appSyncClient;
};

/**
 * Clear the AppSync client cache
 */
export const clearCache = async () => {
  if (appSyncClient) {
    try {
      await appSyncClient.clearStore();
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }
  return false;
};

export default getAppSyncClient; 