/**
 * Script: fix_employee_management_direct.js
 * Version: 1.0
 * Date: 2025-04-20
 * Purpose: Direct fix for EmployeeManagement component session handling
 * Issue: Session expiration causes unhandled error when navigating to employee management
 */

// Since the automatic script approach may have limitations,
// this script directly edits the component file to ensure
// the required functions are properly defined.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name correctly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File path
const employeeManagementPath = path.join(
  __dirname, '../../src/app/dashboard/components/forms/EmployeeManagement.js'
);

// Check if file exists
if (!fs.existsSync(employeeManagementPath)) {
  console.error(`Error: File not found: ${employeeManagementPath}`);
  process.exit(1);
}

// Read current file content
const content = fs.readFileSync(employeeManagementPath, 'utf8');

// Backup the original file
const backupPath = `${employeeManagementPath}.backup-direct`;
fs.writeFileSync(backupPath, content, 'utf8');
console.log(`Created backup at: ${backupPath}`);

// Create a direct edit for the component methods
const directFixContent = `'use client';
import React, { useState, useEffect, useCallback, memo, Fragment, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { axiosInstance, backendHrApiInstance, resetCircuitBreakers } from '@/lib/axiosConfig';
import { countries } from 'countries-list';
import { format, parseISO } from 'date-fns';
import EmployeePermissions from './EmployeePermissions';
import { refreshUserSession } from '@/utils/refreshUserSession';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useTable, usePagination, useSortBy } from 'react-table';
import { extractTenantId, getSecureTenantId } from '@/utils/tenantUtils';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
// Import the API utilities
import api from '@/utils/api';
import { logger } from '@/utils/logger';
import { employeeApi } from '@/utils/apiClient';
import { invalidateCache } from '@/utils/apiHelpers';
import { verifyBackendConnection } from '@/lib/axiosConfig';
import BackendConnectionCheck from '../BackendConnectionCheck';

const EmployeeManagement = () => {
  // Function to manually refresh the user session
  const refreshSession = async () => {
    try {
      setLoading(true);
      const refreshed = await refreshUserSession();
      if (refreshed) {
        setError(null);
        toast.success('Session refreshed successfully');
        fetchEmployees(); // Retry fetching data
      } else {
        setError('Failed to refresh session. Please log in again.');
      }
    } catch (error) {
      logger.error('[EmployeeManagement] Error refreshing session:', error);
      setError('Failed to refresh session. Please log in again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle login redirection on session expiration
  const redirectToLogin = () => {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = \`/login?expired=true&redirect=\${encodeURIComponent(currentPath)}\`;
  };

  // ... Rest of original component content ...
`;

try {
  // Write the initial part of the file with the function definitions
  if (content.includes('const EmployeeManagement = () => {')) {
    // Preserve the original content except for the component declaration
    const componentStartPos = content.indexOf('const EmployeeManagement = () => {');
    const componentOpeningPos = componentStartPos + 'const EmployeeManagement = () => {'.length;
    
    // Find the content after the component opening
    const restOfContent = content.substring(componentOpeningPos);
    
    // Create the new content by combining our fixed component start with the original content
    const newContent = directFixContent + restOfContent;
    
    // Write the new content to the file
    fs.writeFileSync(employeeManagementPath, newContent, 'utf8');
    console.log(`Successfully fixed the EmployeeManagement component with direct approach`);
  } else {
    console.error(`Could not find the EmployeeManagement component declaration in the file`);
    process.exit(1);
  }
} catch (error) {
  console.error(`Error updating file: ${error.message}`);
  process.exit(1);
}

console.log('Direct fix script completed successfully'); 