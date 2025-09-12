/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Temporarily disable Sentry to fix black screen issue
// import initSentry from './src/services/sentry';
// initSentry();

AppRegistry.registerComponent(appName, () => App);
