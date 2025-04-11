// /Users/kuoldeng/projectx/frontend/pyfactor_next/jest.setup.js
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => require('next-router-mock'));