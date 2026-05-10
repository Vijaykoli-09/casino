/**
 * @format
 */

// ── MUST BE FIRST — before any other imports ──────────────────────────────
import 'react-native-url-polyfill/auto';

// TextEncoder/TextDecoder polyfill for @stomp/stompjs
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('text-encoding');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);