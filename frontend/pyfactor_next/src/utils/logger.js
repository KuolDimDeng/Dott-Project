import debug from 'debug';

const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

const LOG_LEVEL_NUMBERS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Create debug instances for different components
const debugAuth = debug('pyfactor:auth');
const debugSession = debug('pyfactor:session');
const debugAmplify = debug('pyfactor:amplify');
const debugRoutes = debug('pyfactor:routes');
const debugEnv = debug('pyfactor:env');
const debugConfig = debug('pyfactor:config');

// Enable debug in development
if (process.env.NODE_ENV === 'development') {
  debug.enable('pyfactor:*');
}

const getLogLevel = () => {
  return process.env.NEXT_PUBLIC_LOG_LEVEL || LOG_LEVELS.DEBUG;
};

const shouldLog = (level) => {
  const currentLevel = getLogLevel();
  const currentLevelNumber = LOG_LEVEL_NUMBERS[currentLevel];
  const targetLevelNumber = LOG_LEVEL_NUMBERS[level];
  return targetLevelNumber >= currentLevelNumber;
};

const formatMessage = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  const prefix = process.env.NEXT_PUBLIC_ENV === 'production' ? 'PyFactor' : '[PyFactor]';
  return `${prefix} [${timestamp}] [${level.toUpperCase()}] ${message}`;
};

const formatObject = (obj) => {
  if (obj instanceof Error) {
    return {
      message: obj.message,
      name: obj.name,
      stack: obj.stack,
      code: obj.code
    };
  }
  
  // Handle undefined or null
  if (obj === undefined) return 'undefined';
  if (obj === null) return 'null';

  // Handle environment variables specially
  if (typeof obj === 'object' && obj !== null) {
    const formatted = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.includes('COGNITO') || key.includes('AWS')) {
        formatted[key] = value ? '[REDACTED]' : value;
      } else {
        formatted[key] = value;
      }
    }
    return formatted;
  }

  return obj;
};

const createLogFunction = (level) => {
  return (message, ...args) => {
    if (!shouldLog(level)) return;

    const formattedMessage = formatMessage(level, message);
    const formattedArgs = args.map(formatObject);
    
    // Log to debug based on component
    if (message.includes('[Auth]')) {
      debugAuth(formattedMessage, ...formattedArgs);
    } else if (message.includes('[Session]')) {
      debugSession(formattedMessage, ...formattedArgs);
    } else if (message.includes('[Amplify]')) {
      debugAmplify(formattedMessage, ...formattedArgs);
    } else if (message.includes('[Route]')) {
      debugRoutes(formattedMessage, ...formattedArgs);
    } else if (message.includes('[EnvConfig]')) {
      debugEnv(formattedMessage, ...formattedArgs);
    } else if (message.includes('[Config]')) {
      debugConfig(formattedMessage, ...formattedArgs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_LOG_TO_CONSOLE === 'true') {
      switch (level) {
        case LOG_LEVELS.DEBUG:
          console.debug(formattedMessage, ...formattedArgs);
          break;
        case LOG_LEVELS.INFO:
          console.info(formattedMessage, ...formattedArgs);
          break;
        case LOG_LEVELS.WARN:
          console.warn(formattedMessage, ...formattedArgs);
          break;
        case LOG_LEVELS.ERROR:
          console.error(formattedMessage, ...formattedArgs);
          break;
        default:
          console.log(formattedMessage, ...formattedArgs);
      }
    }
  };
};

export const logger = {
  debug: createLogFunction(LOG_LEVELS.DEBUG),
  info: createLogFunction(LOG_LEVELS.INFO),
  warn: createLogFunction(LOG_LEVELS.WARN),
  error: createLogFunction(LOG_LEVELS.ERROR),
  
  // Helper method to log errors with stack traces
  logError: (error, context = {}) => {
    if (!shouldLog(LOG_LEVELS.ERROR)) return;

    const errorInfo = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      ...context
    };

    debugAuth('Error occurred:', errorInfo);

    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_LOG_TO_CONSOLE === 'true') {
      console.error(
        formatMessage(LOG_LEVELS.ERROR, 'Error occurred:'),
        errorInfo
      );
    }
  },

  // Helper method to log objects with proper formatting
  logObject: (level, message, obj) => {
    if (!shouldLog(level)) return;

    const formattedMessage = formatMessage(level, message);
    const formattedObj = formatObject(obj);

    if (message.includes('[Auth]')) {
      debugAuth(formattedMessage, formattedObj);
    } else if (message.includes('[Session]')) {
      debugSession(formattedMessage, formattedObj);
    } else if (message.includes('[Amplify]')) {
      debugAmplify(formattedMessage, formattedObj);
    } else if (message.includes('[Route]')) {
      debugRoutes(formattedMessage, formattedObj);
    } else if (message.includes('[EnvConfig]')) {
      debugEnv(formattedMessage, formattedObj);
    } else if (message.includes('[Config]')) {
      debugConfig(formattedMessage, formattedObj);
    }

    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_LOG_TO_CONSOLE === 'true') {
      switch (level) {
        case LOG_LEVELS.DEBUG:
          console.debug(formattedMessage, formattedObj);
          break;
        case LOG_LEVELS.INFO:
          console.info(formattedMessage, formattedObj);
          break;
        case LOG_LEVELS.WARN:
          console.warn(formattedMessage, formattedObj);
          break;
        case LOG_LEVELS.ERROR:
          console.error(formattedMessage, formattedObj);
          break;
        default:
          console.log(formattedMessage, formattedObj);
      }
    }
  }
};
