# AWS App Cache Implementation

## Overview

This document describes the implementation of AWS App Cache for token storage in the frontend.

## Changes Made

1. **Created AppCache Utility**
   - Added functions for storing and retrieving data from AWS App Cache
   - Added functions for removing data from AWS App Cache
   - Added functions for clearing all data from AWS App Cache
   - Added functions for checking if AWS App Cache is available
   - Added functions for initializing AWS App Cache

2. **Updated Authentication Provider**
   - Updated login function to store tokens in AWS App Cache
   - Updated logout function to clear tokens from AWS App Cache
   - Updated checkAuth function to store tokens in AWS App Cache
   - Updated refreshSession function to store tokens in AWS App Cache
   - Updated getTokens function to retrieve tokens from AWS App Cache

3. **Updated API Client**
   - Updated createAxiosInstance function to retrieve tokens from AWS App Cache
   - Updated getApiClient function to use createAxiosInstance
   - Added response interceptor to store tokens from response headers

## Files Modified

1. **frontend/pyfactor_next/src/utils/appCache.js (new file)**
   - Added functions for AWS App Cache operations

2. **frontend/pyfactor_next/src/providers/AuthProvider.js**
   - Updated authentication functions to use AWS App Cache

3. **frontend/pyfactor_next/src/utils/apiClient.js**
   - Updated API client functions to use AWS App Cache

## How to Use

1. **Storing Data**
   - Use `setAppCacheItem(key, value)` to store data in AWS App Cache
   - Use `getAppCacheItem(key)` to retrieve data from AWS App Cache
   - Use `removeAppCacheItem(key)` to remove data from AWS App Cache
   - Use `clearAppCache()` to clear all data from AWS App Cache

2. **Checking Availability**
   - Use `isAppCacheAvailable()` to check if AWS App Cache is available
   - Use `initAppCache()` to initialize AWS App Cache

3. **Authentication**
   - Tokens are stored in AWS App Cache during login
   - Tokens are retrieved from AWS App Cache during API requests
   - Tokens are cleared from AWS App Cache during logout

## Security Considerations

1. **Token Storage**
   - Tokens are stored in AWS App Cache, not in cookies or localStorage
   - Tokens are passed in request headers, not in cookies
   - Tokens are returned in response headers, not in cookies

2. **Token Refresh**
   - Tokens are refreshed through AWS App Cache
   - Refresh tokens are stored in AWS App Cache
   - Refresh tokens are passed in request headers

3. **Session Management**
   - Sessions are managed through AWS App Cache
   - Sessions are validated server-side
   - Sessions are refreshed through Cognito

## Version History

- **v1.0 (2025-04-24)**: Initial implementation
