/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { initializeErrorSuppression } from './src/utils/errorSuppressor';

// Initialize error suppression before anything else
// This ensures ALL errors only appear in Xcode console, not on the phone
initializeErrorSuppression();

// Temporarily disable Sentry to fix black screen issue
// import initSentry from './src/services/sentry';
// initSentry();

AppRegistry.registerComponent(appName, () => App);
