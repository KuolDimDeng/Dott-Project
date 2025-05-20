/**
 * Logger for lib directory - re-exports the main logger from utils
 */

import { logger as utilsLogger } from '@/utils/logger';

// Re-export the logger from utils
export const logger = utilsLogger;

export default logger; 